const prisma = require('../utils/prismaClient');

// Helper function to generate adjustment number
const generateAdjustmentNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const lastAdjustment = await prisma.stockAdjustment.findFirst({
    where: {
      adjustmentNumber: {
        startsWith: `ADJ-${year}${month}`
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let sequence = 1;
  if (lastAdjustment) {
    const lastSequence = parseInt(lastAdjustment.adjustmentNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `ADJ-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

// Get all stock adjustments with filters
const getStockAdjustments = async (req, res) => {
  try {
    const { status, warehouseId, reason, page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;
    if (reason) where.reason = reason;

    const [adjustments, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        include: {
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
      prisma.stockAdjustment.count({ where })
    ]);

    res.json({
      adjustments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stock adjustments', error: error.message });
  }
};

// Get stock adjustment by ID
const getStockAdjustmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
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

    if (!adjustment) {
      return res.status(404).json({ message: 'Stock adjustment not found' });
    }

    res.json(adjustment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stock adjustment', error: error.message });
  }
};

// Create stock adjustment
const createStockAdjustment = async (req, res) => {
  try {
    const { warehouseId, reason, adjustmentDate, notes, items } = req.body;
    const userId = req.user.id;

    if (!warehouseId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Warehouse and items are required' });
    }

    const adjustmentNumber = await generateAdjustmentNumber();

    // Get current stock quantities for system quantity
    const itemsWithSystemQuantity = await Promise.all(
      items.map(async (item) => {
        const stock = await prisma.stock.findFirst({
          where: {
            productId: item.productId,
            warehouseId: warehouseId,
            locationId: null
          }
        });

        return {
          productId: item.productId,
          systemQuantity: stock ? stock.quantity : 0,
          countedQuantity: item.countedQuantity,
          difference: item.countedQuantity - (stock ? stock.quantity : 0),
          notes: item.notes
        };
      })
    );

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        adjustmentNumber,
        warehouseId,
        reason: reason || 'OTHER',
        adjustmentDate: adjustmentDate ? new Date(adjustmentDate) : null,
        notes,
        status: 'DRAFT',
        createdById: userId,
        items: {
          create: itemsWithSystemQuantity
        }
      },
      include: {
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.status(201).json(adjustment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating stock adjustment', error: error.message });
  }
};

// Update stock adjustment
const updateStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, adjustmentDate, notes, status, items } = req.body;

    // Check if adjustment exists and is not DONE or CANCELED
    const existingAdjustment = await prisma.stockAdjustment.findUnique({
      where: { id }
    });

    if (!existingAdjustment) {
      return res.status(404).json({ message: 'Stock adjustment not found' });
    }

    if (existingAdjustment.status === 'DONE' || existingAdjustment.status === 'CANCELED') {
      return res.status(400).json({ message: 'Cannot update completed or canceled adjustment' });
    }

    // Update adjustment and items
    const adjustment = await prisma.$transaction(async (tx) => {
      // Delete existing items if new items provided
      if (items) {
        await tx.adjustmentItem.deleteMany({
          where: { adjustmentId: id }
        });

        // Get current stock quantities for system quantity
        const itemsWithSystemQuantity = await Promise.all(
          items.map(async (item) => {
            const stock = await tx.stock.findFirst({
              where: {
                productId: item.productId,
                warehouseId: existingAdjustment.warehouseId,
                locationId: null
              }
            });

            return {
              productId: item.productId,
              systemQuantity: stock ? stock.quantity : 0,
              countedQuantity: item.countedQuantity,
              difference: item.countedQuantity - (stock ? stock.quantity : 0),
              notes: item.notes
            };
          })
        );

        // Update adjustment
        return await tx.stockAdjustment.update({
          where: { id },
          data: {
            reason,
            adjustmentDate: adjustmentDate ? new Date(adjustmentDate) : undefined,
            notes,
            status,
            items: {
              create: itemsWithSystemQuantity
            }
          },
          include: {
            warehouse: true,
            items: {
              include: {
                product: true
              }
            }
          }
        });
      } else {
        return await tx.stockAdjustment.update({
          where: { id },
          data: {
            reason,
            adjustmentDate: adjustmentDate ? new Date(adjustmentDate) : undefined,
            notes,
            status
          },
          include: {
            warehouse: true,
            items: {
              include: {
                product: true
              }
            }
          }
        });
      }
    });

    res.json(adjustment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating stock adjustment', error: error.message });
  }
};

// Validate stock adjustment (apply adjustments to stock)
const validateStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;

    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!adjustment) {
      return res.status(404).json({ message: 'Stock adjustment not found' });
    }

    if (adjustment.status === 'DONE') {
      return res.status(400).json({ message: 'Adjustment already validated' });
    }

    // Update adjustment and stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Apply adjustments to stock
      for (const item of adjustment.items) {
        if (item.difference !== 0) {
          // Update or create stock
          const existingStock = await tx.stock.findFirst({
            where: {
              productId: item.productId,
              warehouseId: adjustment.warehouseId,
              locationId: null
            }
          });

          if (existingStock) {
            const newQuantity = item.countedQuantity;
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
                productId: item.productId,
                warehouseId: adjustment.warehouseId,
                transactionType: 'ADJUST',
                referenceType: 'ADJUSTMENT',
                referenceId: adjustment.id,
                quantityBefore: item.systemQuantity,
                quantityChange: item.difference,
                quantityAfter: newQuantity,
                notes: `Adjustment ${adjustment.adjustmentNumber} - ${adjustment.reason}`
              }
            });
          } else {
            // Create new stock record
            await tx.stock.create({
              data: {
                productId: item.productId,
                warehouseId: adjustment.warehouseId,
                quantity: item.countedQuantity,
                available: item.countedQuantity,
                reserved: 0
              }
            });

            // Create stock ledger entry
            await tx.stockLedger.create({
              data: {
                productId: item.productId,
                warehouseId: adjustment.warehouseId,
                transactionType: 'ADJUST',
                referenceType: 'ADJUSTMENT',
                referenceId: adjustment.id,
                quantityBefore: 0,
                quantityChange: item.countedQuantity,
                quantityAfter: item.countedQuantity,
                notes: `Adjustment ${adjustment.adjustmentNumber} - ${adjustment.reason}`
              }
            });
          }
        }
      }

      // Update adjustment status
      return await tx.stockAdjustment.update({
        where: { id },
        data: {
          status: 'DONE',
          adjustmentDate: new Date()
        },
        include: {
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
    res.status(500).json({ message: 'Error validating stock adjustment', error: error.message });
  }
};

// Cancel stock adjustment
const cancelStockAdjustment = async (req, res) => {
  try {
    const { id } = req.params;

    const adjustment = await prisma.stockAdjustment.update({
      where: { id },
      data: {
        status: 'CANCELED'
      },
      include: {
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json(adjustment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error canceling stock adjustment', error: error.message });
  }
};

// Get stock ledger (move history)
const getStockLedger = async (req, res) => {
  try {
    const { productId, warehouseId, referenceType, page = 1, limit = 50 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (referenceType) where.referenceType = referenceType;

    // Fetch warehouses and locations separately since StockLedger doesn't have direct relations
    const [ledger, total, allWarehouses, allLocations] = await Promise.all([
      prisma.stockLedger.findMany({
        where,
        include: {
          product: {
            include: {
              category: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.stockLedger.count({ where }),
      prisma.warehouse.findMany({ where: { isActive: true } }),
      prisma.location.findMany({ where: { isActive: true } })
    ]);

    // Enrich ledger entries with warehouse and location data
    const enrichedLedger = ledger.map(entry => ({
      ...entry,
      warehouse: allWarehouses.find(w => w.id === entry.warehouseId) || null,
      location: entry.locationId ? (allLocations.find(l => l.id === entry.locationId) || null) : null
    }));

    res.json({
      ledger: enrichedLedger,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stock ledger', error: error.message });
  }
};

module.exports = {
  getStockAdjustments,
  getStockAdjustmentById,
  createStockAdjustment,
  updateStockAdjustment,
  validateStockAdjustment,
  cancelStockAdjustment,
  getStockLedger
};
