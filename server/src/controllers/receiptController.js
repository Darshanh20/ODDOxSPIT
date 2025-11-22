const prisma = require('../utils/prismaClient');

// Helper function to generate receipt number
const generateReceiptNumber = async (warehouseCode) => {
  // Extract warehouse prefix (e.g., "WH" from "WH/PA/564")
  let warehousePrefix = 'WH';
  if (warehouseCode) {
    if (warehouseCode.includes('/')) {
      warehousePrefix = warehouseCode.split('/')[0];
    } else if (warehouseCode.includes('-')) {
      warehousePrefix = warehouseCode.split('-')[0];
    } else {
      warehousePrefix = warehouseCode.length >= 2 ? warehouseCode.substring(0, 2) : warehouseCode;
    }
  }
  
  // Find the last receipt with the same warehouse prefix
  const lastReceipt = await prisma.receipt.findFirst({
    where: {
      receiptNumber: {
        startsWith: `${warehousePrefix}/IN/`
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let sequence = 1;
  if (lastReceipt) {
    const parts = lastReceipt.receiptNumber.split('/');
    if (parts.length === 3 && parts[1] === 'IN') {
      const lastSequence = parseInt(parts[2]);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
  }

  // Format: {WAREHOUSE_CODE}/IN/{SEQUENCE_NUMBER}
  return `${warehousePrefix}/IN/${String(sequence).padStart(4, '0')}`;
};

// Get all receipts with filters
const getReceipts = async (req, res) => {
  try {
    const { status, warehouseId, supplierId, page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;
    if (supplierId) where.supplierId = supplierId;

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          items: {
            include: {
              product: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.receipt.count({ where })
    ]);

    res.json({
      receipts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching receipts', error: error.message });
  }
};

// Get receipt by ID
const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching receipt', error: error.message });
  }
};

// Create receipt
const createReceipt = async (req, res) => {
  try {
    const { supplierId, warehouseId, scheduledDate, notes, items } = req.body;
    const userId = req.user.id;

    if (!warehouseId) {
      return res.status(400).json({ message: 'Warehouse is required' });
    }

    // Fetch warehouse to get code
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId }
    });

    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    const receiptNumber = await generateReceiptNumber(warehouse.code);

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        supplierId,
        warehouseId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes,
        status: 'DRAFT',
        createdById: userId,
        items: (items && Array.isArray(items) && items.length > 0) ? {
          create: items.map(item => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            quantityReceived: 0,
            unitPrice: item.unitPrice || 0,
            notes: item.notes
          }))
        } : undefined
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.status(201).json(receipt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating receipt', error: error.message });
  }
};

// Update receipt
const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId, scheduledDate, notes, status, items } = req.body;

    // Check if receipt exists and is not DONE or CANCELED
    const existingReceipt = await prisma.receipt.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingReceipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    if (existingReceipt.status === 'DONE' || existingReceipt.status === 'CANCELED') {
      return res.status(400).json({ message: 'Cannot update completed or canceled receipt' });
    }

    // Update receipt and items
    const receipt = await prisma.$transaction(async (tx) => {
      // Delete existing items if new items provided
      if (items) {
        await tx.receiptItem.deleteMany({
          where: { receiptId: id }
        });
      }

      // Update receipt
      return await tx.receipt.update({
        where: { id },
        data: {
          supplierId,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          notes,
          status,
          items: items ? {
            create: items.map(item => ({
              productId: item.productId,
              quantityOrdered: item.quantityOrdered,
              quantityReceived: item.quantityReceived || 0,
              unitPrice: item.unitPrice || 0,
              notes: item.notes
            }))
          } : undefined
        },
        include: {
          supplier: true,
          warehouse: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });
    });

    res.json(receipt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating receipt', error: error.message });
  }
};

// Validate receipt (receive goods and update stock)
const validateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { itemId, quantityReceived }

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    if (receipt.status === 'DONE') {
      return res.status(400).json({ message: 'Receipt already validated' });
    }

    // Update receipt and stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update receipt items with received quantities
      for (const item of items) {
        await tx.receiptItem.update({
          where: { id: item.itemId },
          data: { quantityReceived: item.quantityReceived }
        });

        // Find the corresponding receipt item
        const receiptItem = receipt.items.find(ri => ri.id === item.itemId);
        
        if (receiptItem && item.quantityReceived > 0) {
          // Update or create stock
          const existingStock = await tx.stock.findFirst({
            where: {
              productId: receiptItem.productId,
              warehouseId: receipt.warehouseId,
              locationId: null
            }
          });

          if (existingStock) {
            const newQuantity = existingStock.quantity + item.quantityReceived;
            await tx.stock.update({
              where: { id: existingStock.id },
              data: {
                quantity: newQuantity,
                available: newQuantity - existingStock.reserved
              }
            });

            // Create stock ledger entry
            await tx.stockLedger.create({
              data: {
                productId: receiptItem.productId,
                warehouseId: receipt.warehouseId,
                transactionType: 'IN',
                referenceType: 'RECEIPT',
                referenceId: receipt.id,
                quantityBefore: existingStock.quantity,
                quantityChange: item.quantityReceived,
                quantityAfter: newQuantity,
                notes: `Receipt ${receipt.receiptNumber}`
              }
            });
          } else {
            await tx.stock.create({
              data: {
                productId: receiptItem.productId,
                warehouseId: receipt.warehouseId,
                quantity: item.quantityReceived,
                available: item.quantityReceived,
                reserved: 0
              }
            });

            // Create stock ledger entry
            await tx.stockLedger.create({
              data: {
                productId: receiptItem.productId,
                warehouseId: receipt.warehouseId,
                transactionType: 'IN',
                referenceType: 'RECEIPT',
                referenceId: receipt.id,
                quantityBefore: 0,
                quantityChange: item.quantityReceived,
                quantityAfter: item.quantityReceived,
                notes: `Receipt ${receipt.receiptNumber}`
              }
            });
          }
        }
      }

      // Update receipt status
      const userId = req.user.id;
      const updatedReceipt = await tx.receipt.update({
        where: { id },
        data: {
          status: 'DONE',
          receivedDate: new Date(),
          completedById: userId,
          completedAt: new Date()
        },
        include: {
          supplier: true,
          warehouse: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          taskType: 'receipt',
          taskId: id,
          reference: receipt.receiptNumber,
          action: 'completed',
          performedById: userId,
          details: `Receipt ${receipt.receiptNumber} validated and stock increased`
        }
      });

      return updatedReceipt;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error validating receipt', error: error.message });
  }
};

// Accept receipt task (staff)
const acceptReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Use transaction to prevent race condition
    const receipt = await prisma.$transaction(async (tx) => {
      const existing = await tx.receipt.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new Error('Receipt not found');
      }

      if (existing.assignedToId && existing.assignedToId !== userId) {
        throw new Error('Receipt already assigned to another staff member');
      }

      // Update receipt with assignment
      const updated = await tx.receipt.update({
        where: { id },
        data: {
          assignedToId: userId,
          acceptedById: userId,
          acceptedAt: new Date()
        },
        include: {
          supplier: true,
          warehouse: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          taskType: 'receipt',
          taskId: id,
          reference: existing.receiptNumber,
          action: 'accepted',
          performedById: userId,
          details: `Receipt ${existing.receiptNumber} accepted by staff`
        }
      });

      return updated;
    });

    res.json(receipt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error accepting receipt', error: error.message });
  }
};

// Cancel receipt
const cancelReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await prisma.receipt.update({
      where: { id },
      data: {
        status: 'CANCELED'
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json(receipt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error canceling receipt', error: error.message });
  }
};

module.exports = {
  getReceipts,
  getReceiptById,
  createReceipt,
  updateReceipt,
  validateReceipt,
  cancelReceipt,
  acceptReceipt
};
