const prisma = require('../utils/prismaClient');

// Helper function to generate transfer number
const generateTransferNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const lastTransfer = await prisma.internalTransfer.findFirst({
    where: {
      transferNumber: {
        startsWith: `TRF-${year}${month}`
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let sequence = 1;
  if (lastTransfer) {
    const lastSequence = parseInt(lastTransfer.transferNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `TRF-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

// Get all internal transfers with filters
const getInternalTransfers = async (req, res) => {
  try {
    const { status, fromWarehouseId, toWarehouseId, page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (fromWarehouseId) where.fromWarehouseId = fromWarehouseId;
    if (toWarehouseId) where.toWarehouseId = toWarehouseId;

    const [transfers, total] = await Promise.all([
      prisma.internalTransfer.findMany({
        where,
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          fromLocation: true,
          toLocation: true,
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
      prisma.internalTransfer.count({ where })
    ]);

    res.json({
      transfers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching internal transfers', error: error.message });
  }
};

// Get internal transfer by ID
const getInternalTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        fromLocation: true,
        toLocation: true,
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

    if (!transfer) {
      return res.status(404).json({ message: 'Internal transfer not found' });
    }

    res.json(transfer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching internal transfer', error: error.message });
  }
};

// Create internal transfer
const createInternalTransfer = async (req, res) => {
  try {
    const {
      fromWarehouseId,
      toWarehouseId,
      fromLocationId,
      toLocationId,
      scheduledDate,
      fromContact,
      contactName,
      notes,
      items
    } = req.body;
    const userId = req.user.id;

    if (!fromWarehouseId || !toWarehouseId || !items || items.length === 0) {
      return res.status(400).json({ message: 'From warehouse, to warehouse, and items are required' });
    }

    if (fromWarehouseId === toWarehouseId && fromLocationId === toLocationId) {
      return res.status(400).json({ message: 'Source and destination cannot be the same' });
    }

    const transferNumber = await generateTransferNumber();

    // Create transfer in DRAFT state (no delivery created yet, no stock changes)
    const transfer = await prisma.internalTransfer.create({
      data: {
        transferNumber,
        fromWarehouseId,
        toWarehouseId,
        fromLocationId,
        toLocationId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        fromContact: fromContact || null,
        contactName: contactName || null,
        notes,
        status: 'DRAFT', // Start as DRAFT
        createdById: userId,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantityRequested: item.quantityRequested,
            quantityTransferred: 0,
            notes: item.notes
          }))
        }
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        fromLocation: true,
        toLocation: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.status(201).json(transfer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating internal transfer', error: error.message });
  }
};

// Update internal transfer
const updateInternalTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromLocationId, toLocationId, scheduledDate, notes, status, items } = req.body;

    // Check if transfer exists and is not DONE or CANCELED
    const existingTransfer = await prisma.internalTransfer.findUnique({
      where: { id }
    });

    if (!existingTransfer) {
      return res.status(404).json({ message: 'Internal transfer not found' });
    }

    if (existingTransfer.status === 'DONE' || existingTransfer.status === 'CANCELED') {
      return res.status(400).json({ message: 'Cannot update completed or canceled transfer' });
    }

    // Update transfer and items
    const transfer = await prisma.$transaction(async (tx) => {
      // Delete existing items if new items provided
      if (items) {
        await tx.transferItem.deleteMany({
          where: { transferId: id }
        });
      }

      // Update transfer
      return await tx.internalTransfer.update({
        where: { id },
        data: {
          fromLocationId,
          toLocationId,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          notes,
          status,
          items: items ? {
            create: items.map(item => ({
              productId: item.productId,
              quantityRequested: item.quantityRequested,
              quantityTransferred: item.quantityTransferred || 0,
              notes: item.notes
            }))
          } : undefined
        },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          fromLocation: true,
          toLocation: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });
    });

    res.json(transfer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating internal transfer', error: error.message });
  }
};

// Validate internal transfer (complete transfer and update stock)
const validateInternalTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { itemId, quantityTransferred }

    const transfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        fromLocation: true,
        toLocation: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!transfer) {
      return res.status(404).json({ message: 'Internal transfer not found' });
    }

    if (transfer.status === 'DONE') {
      return res.status(400).json({ message: 'Transfer already validated' });
    }

    if (transfer.status !== 'DRAFT' && transfer.status !== 'READY') {
      return res.status(400).json({ message: `Cannot validate transfer with status: ${transfer.status}` });
    }

    // Use provided items or all transfer items
    const itemsToProcess = items || transfer.items.map(item => ({
      itemId: item.id,
      quantityTransferred: item.quantityRequested
    }));

    // Validate stock availability before processing
    for (const item of itemsToProcess) {
      const transferItem = transfer.items.find(ti => ti.id === item.itemId);
      if (transferItem && item.quantityTransferred > 0) {
        const sourceStock = await prisma.stock.findFirst({
          where: {
            productId: transferItem.productId,
            warehouseId: transfer.fromWarehouseId,
            locationId: transfer.fromLocationId || null
          }
        });

        if (!sourceStock || sourceStock.available < item.quantityTransferred) {
          return res.status(400).json({ 
            message: `Insufficient stock for product ${transferItem.product.name}. Available: ${sourceStock?.available || 0}, Requested: ${item.quantityTransferred}` 
          });
        }
      }
    }

    // Update transfer and stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update transfer items with transferred quantities
      for (const item of itemsToProcess) {
        await tx.transferItem.update({
          where: { id: item.itemId },
          data: { quantityTransferred: item.quantityTransferred }
        });

        // Find the corresponding transfer item
        const transferItem = transfer.items.find(ti => ti.id === item.itemId);
        
        if (transferItem && item.quantityTransferred > 0) {
          // Reduce stock from source warehouse/location
          const sourceStock = await tx.stock.findFirst({
            where: {
              productId: transferItem.productId,
              warehouseId: transfer.fromWarehouseId,
              locationId: transfer.fromLocationId || null
            }
          });

          if (sourceStock) {
            const newSourceQuantity = sourceStock.quantity - item.quantityTransferred;
            await tx.stock.update({
              where: { id: sourceStock.id },
              data: {
                quantity: newSourceQuantity,
                available: newSourceQuantity - sourceStock.reserved
              }
            });

            // Create stock ledger entry for source
            await tx.stockLedger.create({
              data: {
                productId: transferItem.productId,
                warehouseId: transfer.fromWarehouseId,
                locationId: transfer.fromLocationId,
                transactionType: 'TRANSFER',
                referenceType: 'TRANSFER',
                referenceId: transfer.id,
                quantityBefore: sourceStock.quantity,
                quantityChange: -item.quantityTransferred,
                quantityAfter: newSourceQuantity,
                notes: `Transfer OUT ${transfer.transferNumber}`
              }
            });
          }

          // Add stock to destination warehouse/location
          const destStock = await tx.stock.findFirst({
            where: {
              productId: transferItem.productId,
              warehouseId: transfer.toWarehouseId,
              locationId: transfer.toLocationId || null
            }
          });

          if (destStock) {
            const newDestQuantity = destStock.quantity + item.quantityTransferred;
            await tx.stock.update({
              where: { id: destStock.id },
              data: {
                quantity: newDestQuantity,
                available: newDestQuantity - destStock.reserved
              }
            });

            // Create stock ledger entry for destination
            await tx.stockLedger.create({
              data: {
                productId: transferItem.productId,
                warehouseId: transfer.toWarehouseId,
                locationId: transfer.toLocationId,
                transactionType: 'TRANSFER',
                referenceType: 'TRANSFER',
                referenceId: transfer.id,
                quantityBefore: destStock.quantity,
                quantityChange: item.quantityTransferred,
                quantityAfter: newDestQuantity,
                notes: `Transfer IN ${transfer.transferNumber}`
              }
            });
          } else {
            await tx.stock.create({
              data: {
                productId: transferItem.productId,
                warehouseId: transfer.toWarehouseId,
                locationId: transfer.toLocationId,
                quantity: item.quantityTransferred,
                available: item.quantityTransferred,
                reserved: 0
              }
            });

            // Create stock ledger entry for destination
            await tx.stockLedger.create({
              data: {
                productId: transferItem.productId,
                warehouseId: transfer.toWarehouseId,
                locationId: transfer.toLocationId,
                transactionType: 'TRANSFER',
                referenceType: 'TRANSFER',
                referenceId: transfer.id,
                quantityBefore: 0,
                quantityChange: item.quantityTransferred,
                quantityAfter: item.quantityTransferred,
                notes: `Transfer IN ${transfer.transferNumber}`
              }
            });
          }
        }
      }

      // Update transfer status
      return await tx.internalTransfer.update({
        where: { id },
        data: {
          status: 'DONE',
          transferredDate: new Date()
        },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          fromLocation: true,
          toLocation: true,
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
    res.status(500).json({ message: 'Error validating internal transfer', error: error.message });
  }
};

// Cancel internal transfer
const cancelInternalTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.internalTransfer.update({
      where: { id },
      data: {
        status: 'CANCELED'
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        fromLocation: true,
        toLocation: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json(transfer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error canceling internal transfer', error: error.message });
  }
};

module.exports = {
  getInternalTransfers,
  getInternalTransferById,
  createInternalTransfer,
  updateInternalTransfer,
  validateInternalTransfer,
  cancelInternalTransfer
};
