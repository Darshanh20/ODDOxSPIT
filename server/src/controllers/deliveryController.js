const prisma = require('../utils/prismaClient');

// Helper function to generate delivery number
const generateDeliveryNumber = async (warehouseCode) => {
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
  
  // Find the last delivery with the same warehouse prefix
  const lastDelivery = await prisma.deliveryOrder.findFirst({
    where: {
      deliveryNumber: {
        startsWith: `${warehousePrefix}/OUT/`
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let sequence = 1;
  if (lastDelivery) {
    const parts = lastDelivery.deliveryNumber.split('/');
    if (parts.length === 3 && parts[1] === 'OUT') {
      const lastSequence = parseInt(parts[2]);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
  }

  // Format: {WAREHOUSE_CODE}/OUT/{SEQUENCE_NUMBER}
  return `${warehousePrefix}/OUT/${String(sequence).padStart(4, '0')}`;
};

// Get all delivery orders with filters
const getDeliveryOrders = async (req, res) => {
  try {
    const { status, warehouseId, customerId, page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;
    if (customerId) where.customerId = customerId;

    const [deliveries, total] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where,
        include: {
          customer: true,
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
      prisma.deliveryOrder.count({ where })
    ]);

    res.json({
      deliveries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching delivery orders', error: error.message });
  }
};

// Get delivery order by ID
const getDeliveryOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        customer: true,
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

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    res.json(delivery);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching delivery order', error: error.message });
  }
};

// Create delivery order
const createDeliveryOrder = async (req, res) => {
  try {
    const { customerId, warehouseId, scheduledDate, shippingAddress, notes, items } = req.body;
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

    const deliveryNumber = await generateDeliveryNumber(warehouse.code);

    const delivery = await prisma.deliveryOrder.create({
      data: {
        deliveryNumber,
        customerId,
        warehouseId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        shippingAddress,
        notes,
        status: 'DRAFT',
        createdById: userId,
        items: (items && Array.isArray(items) && items.length > 0) ? {
          create: items.map(item => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            quantityPicked: 0,
            quantityPacked: 0,
            quantityDelivered: 0,
            notes: item.notes
          }))
        } : undefined
      },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.status(201).json(delivery);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating delivery order', error: error.message });
  }
};

// Update delivery order
const updateDeliveryOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, scheduledDate, shippingAddress, notes, status, items } = req.body;

    // Check if delivery exists and is not DONE or CANCELED
    const existingDelivery = await prisma.deliveryOrder.findUnique({
      where: { id }
    });

    if (!existingDelivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    if (existingDelivery.status === 'DONE' || existingDelivery.status === 'CANCELED') {
      return res.status(400).json({ message: 'Cannot update completed or canceled delivery order' });
    }

    // Update delivery and items
    const delivery = await prisma.$transaction(async (tx) => {
      // Delete existing items if new items provided
      if (items) {
        await tx.deliveryItem.deleteMany({
          where: { deliveryOrderId: id }
        });
      }

      // Update delivery
      return await tx.deliveryOrder.update({
        where: { id },
        data: {
          customerId,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          shippingAddress,
          notes,
          status,
          items: items ? {
            create: items.map(item => ({
              productId: item.productId,
              quantityOrdered: item.quantityOrdered,
              quantityPicked: item.quantityPicked || 0,
              quantityPacked: item.quantityPacked || 0,
              quantityDelivered: item.quantityDelivered || 0,
              notes: item.notes
            }))
          } : undefined
        },
        include: {
          customer: true,
          warehouse: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });
    });

    res.json(delivery);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating delivery order', error: error.message });
  }
};

// Pick items for delivery
const pickDeliveryItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { itemId, quantityPicked }

    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    // Update items with picked quantities
    await prisma.$transaction(
      items.map(item =>
        prisma.deliveryItem.update({
          where: { id: item.itemId },
          data: { quantityPicked: item.quantityPicked }
        })
      )
    );

    // Update delivery status to WAITING
    const updatedDelivery = await prisma.deliveryOrder.update({
      where: { id },
      data: { status: 'WAITING' },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json(updatedDelivery);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error picking delivery items', error: error.message });
  }
};

// Pack items for delivery
const packDeliveryItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { itemId, quantityPacked }

    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    // Update items with packed quantities
    await prisma.$transaction(
      items.map(item =>
        prisma.deliveryItem.update({
          where: { id: item.itemId },
          data: { quantityPacked: item.quantityPacked }
        })
      )
    );

    // Update delivery status to READY
    const updatedDelivery = await prisma.deliveryOrder.update({
      where: { id },
      data: { status: 'READY' },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json(updatedDelivery);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error packing delivery items', error: error.message });
  }
};

// Validate delivery (check stock and set status to WAITING or READY)
const validateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, checkStock = false } = req.body; // Array of { itemId, quantityDelivered }

    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        warehouse: true
      }
    });

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    if (delivery.status === 'DONE') {
      return res.status(400).json({ message: 'Delivery already completed' });
    }

    if (delivery.status === 'CANCELED') {
      return res.status(400).json({ message: 'Cannot validate canceled delivery' });
    }

    // If checkStock is true, validate stock and set status to WAITING or READY
    if (checkStock) {
      // Check stock availability for all items
      const stockChecks = await Promise.all(
        delivery.items.map(async (item) => {
          const stock = await prisma.stock.findFirst({
            where: {
              productId: item.productId,
              warehouseId: delivery.warehouseId,
              locationId: null
            }
          });

          const available = stock ? stock.available : 0;
          const required = item.quantityOrdered;
          const isInStock = available >= required;

          return {
            itemId: item.id,
            productId: item.productId,
            productName: item.product.name,
            required,
            available,
            isInStock
          };
        })
      );

      const allInStock = stockChecks.every(check => check.isInStock);
      const outOfStockItems = stockChecks.filter(check => !check.isInStock);

      // Update delivery status based on stock availability
      const newStatus = allInStock ? 'READY' : 'WAITING';

      // If all in stock, reserve the stock
      if (allInStock) {
        await prisma.$transaction(
          delivery.items.map(item => {
            const stockCheck = stockChecks.find(sc => sc.itemId === item.id);
            return prisma.stock.updateMany({
              where: {
                productId: item.productId,
                warehouseId: delivery.warehouseId,
                locationId: null
              },
              data: {
                reserved: {
                  increment: item.quantityOrdered
                },
                available: {
                  decrement: item.quantityOrdered
                }
              }
            });
          })
        );
      }

      const userId = req.user.id;
      const updatedDelivery = await prisma.deliveryOrder.update({
        where: { id },
        data: { 
          status: newStatus,
          ...(newStatus === 'DONE' && {
            completedById: userId,
            completedAt: new Date()
          })
        },
        include: {
          customer: true,
          warehouse: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      return res.json({
        ...updatedDelivery,
        stockChecks,
        outOfStockItems: outOfStockItems.map(item => ({
          productName: item.productName,
          required: item.required,
          available: item.available
        }))
      });
    }

    // If checkStock is false and status is READY, mark as DONE and decrease stock
    if (delivery.status === 'READY') {
      const result = await prisma.$transaction(async (tx) => {
        // Update delivery items with delivered quantities
        for (const item of items || delivery.items) {
          const itemId = item.itemId || item.id;
          const quantityDelivered = item.quantityDelivered || item.quantityOrdered;

          await tx.deliveryItem.update({
            where: { id: itemId },
            data: { quantityDelivered }
          });

          // Find the corresponding delivery item
          const deliveryItem = delivery.items.find(di => di.id === itemId);
          
          if (deliveryItem && quantityDelivered > 0) {
            // Update stock - decrease quantity and release reservation
            const existingStock = await tx.stock.findFirst({
              where: {
                productId: deliveryItem.productId,
                warehouseId: delivery.warehouseId,
                locationId: null
              }
            });

            if (existingStock) {
              const newQuantity = existingStock.quantity - quantityDelivered;
              const newReserved = Math.max(0, existingStock.reserved - quantityDelivered);
              
              await tx.stock.update({
                where: { id: existingStock.id },
                data: {
                  quantity: newQuantity,
                  reserved: newReserved,
                  available: newQuantity - newReserved
                }
              });

              // Create stock ledger entry
              await tx.stockLedger.create({
                data: {
                  productId: deliveryItem.productId,
                  warehouseId: delivery.warehouseId,
                  transactionType: 'OUT',
                  referenceType: 'DELIVERY',
                  referenceId: delivery.id,
                  quantityBefore: existingStock.quantity,
                  quantityChange: -quantityDelivered,
                  quantityAfter: newQuantity,
                  notes: `Delivery ${delivery.deliveryNumber}`
                }
              });
            }
          }
        }

        // Update delivery status to DONE
        const userId = req.user.id;
        const updatedDelivery = await tx.deliveryOrder.update({
          where: { id },
          data: {
            status: 'DONE',
            deliveredDate: new Date(),
            completedById: userId,
            completedAt: new Date()
          },
          include: {
            customer: true,
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
            taskType: 'delivery',
            taskId: id,
            reference: delivery.deliveryNumber,
            action: 'completed',
            performedById: userId,
            details: `Delivery ${delivery.deliveryNumber} completed and stock decreased`
          }
        });

        return updatedDelivery;
      });

      return res.json(result);
    }

    // If status is not READY, return error
    return res.status(400).json({ 
      message: `Delivery must be in READY status to complete. Current status: ${delivery.status}` 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error validating delivery', error: error.message });
  }
};

// Accept delivery task (staff)
const acceptDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const delivery = await prisma.$transaction(async (tx) => {
      const existing = await tx.deliveryOrder.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new Error('Delivery not found');
      }

      if (existing.assignedToId && existing.assignedToId !== userId) {
        throw new Error('Delivery already assigned to another staff member');
      }

      const updated = await tx.deliveryOrder.update({
        where: { id },
        data: {
          assignedToId: userId,
          acceptedById: userId,
          acceptedAt: new Date()
        },
        include: {
          customer: true,
          warehouse: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      await tx.activityLog.create({
        data: {
          taskType: 'delivery',
          taskId: id,
          reference: existing.deliveryNumber,
          action: 'accepted',
          performedById: userId,
          details: `Delivery ${existing.deliveryNumber} accepted by staff`
        }
      });

      return updated;
    });

    res.json(delivery);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error accepting delivery', error: error.message });
  }
};

// Cancel delivery
const cancelDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await prisma.deliveryOrder.update({
      where: { id },
      data: {
        status: 'CANCELED'
      },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json(delivery);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error canceling delivery', error: error.message });
  }
};

module.exports = {
  getDeliveryOrders,
  getDeliveryOrderById,
  createDeliveryOrder,
  updateDeliveryOrder,
  pickDeliveryItems,
  packDeliveryItems,
  validateDelivery,
  cancelDelivery,
  acceptDelivery
};
