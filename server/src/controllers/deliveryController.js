const prisma = require('../utils/prismaClient');

// Helper function to generate delivery number
const generateDeliveryNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const lastDelivery = await prisma.deliveryOrder.findFirst({
    where: {
      deliveryNumber: {
        startsWith: `DEL-${year}${month}`
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let sequence = 1;
  if (lastDelivery) {
    const lastSequence = parseInt(lastDelivery.deliveryNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `DEL-${year}${month}-${String(sequence).padStart(4, '0')}`;
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

    if (!warehouseId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Warehouse and items are required' });
    }

    const deliveryNumber = await generateDeliveryNumber();

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
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            quantityPicked: 0,
            quantityPacked: 0,
            quantityDelivered: 0,
            notes: item.notes
          }))
        }
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

// Validate delivery (complete delivery and update stock)
const validateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { itemId, quantityDelivered }

    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
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

    if (delivery.status === 'DONE') {
      return res.status(400).json({ message: 'Delivery already validated' });
    }

    // Update delivery and stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update delivery items with delivered quantities
      for (const item of items) {
        await tx.deliveryItem.update({
          where: { id: item.itemId },
          data: { quantityDelivered: item.quantityDelivered }
        });

        // Find the corresponding delivery item
        const deliveryItem = delivery.items.find(di => di.id === item.itemId);
        
        if (deliveryItem && item.quantityDelivered > 0) {
          // Update stock
          const existingStock = await tx.stock.findFirst({
            where: {
              productId: deliveryItem.productId,
              warehouseId: delivery.warehouseId,
              locationId: null
            }
          });

          if (existingStock) {
            const newQuantity = existingStock.quantity - item.quantityDelivered;
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
                productId: deliveryItem.productId,
                warehouseId: delivery.warehouseId,
                transactionType: 'OUT',
                referenceType: 'DELIVERY',
                referenceId: delivery.id,
                quantityBefore: existingStock.quantity,
                quantityChange: -item.quantityDelivered,
                quantityAfter: newQuantity,
                notes: `Delivery ${delivery.deliveryNumber}`
              }
            });
          }
        }
      }

      // Update delivery status
      return await tx.deliveryOrder.update({
        where: { id },
        data: {
          status: 'DONE',
          deliveredDate: new Date()
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

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error validating delivery', error: error.message });
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
  cancelDelivery
};
