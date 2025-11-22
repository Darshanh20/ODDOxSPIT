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

    // Determine initial status based on items and stock availability
    let initialStatus = 'DRAFT';
    
    // If items are provided, check stock availability
    if (items && Array.isArray(items) && items.length > 0) {
      const stockChecks = await Promise.all(
        items.map(async (item) => {
          const stock = await prisma.stock.findFirst({
            where: {
              productId: item.productId,
              warehouseId: warehouseId,
              locationId: null
            }
          });

          const available = stock ? stock.available : 0;
          const required = item.quantityOrdered;
          const isInStock = available >= required;

          return {
            productId: item.productId,
            required,
            available,
            isInStock
          };
        })
      );

      const allInStock = stockChecks.every(check => check.isInStock);
      initialStatus = allInStock ? 'READY' : 'WAITING';
    }

    const delivery = await prisma.deliveryOrder.create({
      data: {
        deliveryNumber,
        customerId,
        warehouseId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        shippingAddress,
        notes,
        status: initialStatus,
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

    // If status is READY, reserve the stock
    if (initialStatus === 'READY' && items && Array.isArray(items) && items.length > 0) {
      await prisma.$transaction(
        items.map(item => {
          return prisma.stock.updateMany({
            where: {
              productId: item.productId,
              warehouseId: warehouseId,
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
      where: { id },
      include: {
        items: true,
        warehouse: true
      }
    });

    if (!existingDelivery) {
      return res.status(404).json({ message: 'Delivery order not found' });
    }

    if (existingDelivery.status === 'DONE' || existingDelivery.status === 'CANCELED') {
      return res.status(400).json({ message: 'Cannot update completed or canceled delivery order' });
    }

    // Determine status if items are updated
    let newStatus = status || existingDelivery.status;
    
    // If items are provided, check stock and update status accordingly
    if (items && Array.isArray(items) && items.length > 0) {
      const stockChecks = await Promise.all(
        items.map(async (item) => {
          const stock = await prisma.stock.findFirst({
            where: {
              productId: item.productId,
              warehouseId: existingDelivery.warehouseId,
              locationId: null
            }
          });

          const available = stock ? stock.available : 0;
          const required = item.quantityOrdered;
          const isInStock = available >= required;

          return {
            productId: item.productId,
            required,
            available,
            isInStock
          };
        })
      );

      const allInStock = stockChecks.every(check => check.isInStock);
      
      // Only update status if not explicitly set and items changed
      if (!status) {
        newStatus = allInStock ? 'READY' : 'WAITING';
      }
    }

    // Update delivery and items
    const delivery = await prisma.$transaction(async (tx) => {
      // Release existing reservations if status was READY
      if (existingDelivery.status === 'READY' && existingDelivery.items.length > 0) {
        for (const item of existingDelivery.items) {
          await tx.stock.updateMany({
            where: {
              productId: item.productId,
              warehouseId: existingDelivery.warehouseId,
              locationId: null
            },
            data: {
              reserved: {
                decrement: item.quantityOrdered
              },
              available: {
                increment: item.quantityOrdered
              }
            }
          });
        }
      }

      // Delete existing items if new items provided
      if (items) {
        await tx.deliveryItem.deleteMany({
          where: { deliveryOrderId: id }
        });
      }

      // Update delivery
      const updatedDelivery = await tx.deliveryOrder.update({
        where: { id },
        data: {
          customerId,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          shippingAddress,
          notes,
          status: newStatus,
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

      // If new status is READY and items are provided, reserve stock
      if (newStatus === 'READY' && items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await tx.stock.updateMany({
            where: {
              productId: item.productId,
              warehouseId: existingDelivery.warehouseId,
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
        }
      }

      return updatedDelivery;
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

      const updatedDelivery = await prisma.deliveryOrder.update({
        where: { id },
        data: { status: newStatus },
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
      // Check if this delivery is related to an internal transfer
      const isInternalTransfer = delivery.notes && delivery.notes.includes('Internal Transfer:');
      let relatedTransfer = null;
      let toWarehouseId = null;
      let toLocationId = null;

      if (isInternalTransfer) {
        // Extract transfer number from notes (format: "Internal Transfer: TRF-XXXX to Warehouse Name")
        const transferMatch = delivery.notes.match(/Internal Transfer: ([A-Z0-9-]+)/);
        if (transferMatch) {
          const transferNumber = transferMatch[1];
          relatedTransfer = await prisma.internalTransfer.findUnique({
            where: { transferNumber },
            include: {
              toWarehouse: true,
              toLocation: true,
              items: {
                include: {
                  product: true
                }
              }
            }
          });
          if (relatedTransfer) {
            toWarehouseId = relatedTransfer.toWarehouseId;
            toLocationId = relatedTransfer.toLocationId;
          }
        }
      }

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
            // Update stock - decrease quantity and release reservation from source
            // For internal transfers, check if we need to use specific location
            let sourceLocationId = null;
            if (isInternalTransfer && relatedTransfer) {
              sourceLocationId = relatedTransfer.fromLocationId;
            }
            
            const existingStock = await tx.stock.findFirst({
              where: {
                productId: deliveryItem.productId,
                warehouseId: delivery.warehouseId,
                locationId: sourceLocationId
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

              // Create stock ledger entry for source (OUT)
              await tx.stockLedger.create({
                data: {
                  productId: deliveryItem.productId,
                  warehouseId: delivery.warehouseId,
                  locationId: sourceLocationId,
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

            // If this is an internal transfer, add stock to destination warehouse
            if (isInternalTransfer && relatedTransfer && toWarehouseId) {
              // Find corresponding transfer item
              const transferItem = relatedTransfer.items.find(
                ti => ti.productId === deliveryItem.productId
              );

              if (transferItem) {
                // Add stock to destination warehouse/location
                const destStock = await tx.stock.findFirst({
                  where: {
                    productId: deliveryItem.productId,
                    warehouseId: toWarehouseId,
                    locationId: toLocationId
                  }
                });

                if (destStock) {
                  const newDestQuantity = destStock.quantity + quantityDelivered;
                  await tx.stock.update({
                    where: { id: destStock.id },
                    data: {
                      quantity: newDestQuantity,
                      available: newDestQuantity - destStock.reserved
                    }
                  });

                  // Create stock ledger entry for destination (IN)
                  await tx.stockLedger.create({
                    data: {
                      productId: deliveryItem.productId,
                      warehouseId: toWarehouseId,
                      locationId: toLocationId,
                      transactionType: 'IN',
                      referenceType: 'TRANSFER',
                      referenceId: relatedTransfer.id,
                      quantityBefore: destStock.quantity,
                      quantityChange: quantityDelivered,
                      quantityAfter: newDestQuantity,
                      notes: `Transfer IN ${relatedTransfer.transferNumber}`
                    }
                  });
                } else {
                  // Create new stock record at destination
                  await tx.stock.create({
                    data: {
                      productId: deliveryItem.productId,
                      warehouseId: toWarehouseId,
                      locationId: toLocationId,
                      quantity: quantityDelivered,
                      available: quantityDelivered,
                      reserved: 0
                    }
                  });

                  // Create stock ledger entry for destination (IN)
                  await tx.stockLedger.create({
                    data: {
                      productId: deliveryItem.productId,
                      warehouseId: toWarehouseId,
                      locationId: toLocationId,
                      transactionType: 'IN',
                      referenceType: 'TRANSFER',
                      referenceId: relatedTransfer.id,
                      quantityBefore: 0,
                      quantityChange: quantityDelivered,
                      quantityAfter: quantityDelivered,
                      notes: `Transfer IN ${relatedTransfer.transferNumber}`
                    }
                  });
                }

                // Update transfer item with transferred quantity
                await tx.transferItem.update({
                  where: { id: transferItem.id },
                  data: { quantityTransferred: quantityDelivered }
                });
              }
            }
          }
        }

        // If this is an internal transfer, update transfer status to DONE
        if (isInternalTransfer && relatedTransfer) {
          // Check if all items are fully transferred
          const allTransferred = relatedTransfer.items.every(item => {
            const deliveryItem = delivery.items.find(di => di.productId === item.productId);
            return deliveryItem && deliveryItem.quantityDelivered >= item.quantityRequested;
          });

          // Only update transfer to DONE if all items are transferred
          if (allTransferred && relatedTransfer.status !== 'DONE') {
            await tx.internalTransfer.update({
              where: { id: relatedTransfer.id },
              data: {
                status: 'DONE',
                transferredDate: new Date()
              }
            });
          }
        }

        // Update delivery status to DONE
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
