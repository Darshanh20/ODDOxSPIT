const prisma = require('../utils/prismaClient');

// Helper function to generate receipt number
const generateReceiptNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const lastReceipt = await prisma.receipt.findFirst({
    where: {
      receiptNumber: {
        startsWith: `REC-${year}${month}`
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let sequence = 1;
  if (lastReceipt) {
    const lastSequence = parseInt(lastReceipt.receiptNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `REC-${year}${month}-${String(sequence).padStart(4, '0')}`;
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

    if (!warehouseId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Warehouse and items are required' });
    }

    const receiptNumber = await generateReceiptNumber();

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        supplierId,
        warehouseId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes,
        status: 'DRAFT',
        createdById: userId,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            quantityReceived: 0,
            unitPrice: item.unitPrice || 0,
            notes: item.notes
          }))
        }
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
      return await tx.receipt.update({
        where: { id },
        data: {
          status: 'DONE',
          receivedDate: new Date()
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

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error validating receipt', error: error.message });
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
  cancelReceipt
};
