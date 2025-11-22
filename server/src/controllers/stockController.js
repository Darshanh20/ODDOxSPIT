const prisma = require('../utils/prismaClient');

// Update stock quantity for a product in a warehouse/location
const updateStock = async (req, res) => {
  try {
    const { productId, warehouseId, locationId, quantity } = req.body;

    if (!productId || !warehouseId || quantity === undefined) {
      return res.status(400).json({ message: 'Product ID, warehouse ID, and quantity are required' });
    }

    if (quantity < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative' });
    }

    // Find or create stock record
    const existingStock = await prisma.stock.findFirst({
      where: {
        productId,
        warehouseId,
        locationId: locationId || null
      }
    });

    let stock;
    const oldQuantity = existingStock ? existingStock.quantity : 0;
    const quantityChange = quantity - oldQuantity;

    if (existingStock) {
      // Update existing stock
      stock = await prisma.stock.update({
        where: { id: existingStock.id },
        data: {
          quantity,
          available: quantity - existingStock.reserved
        },
        include: {
          product: true,
          warehouse: true,
          location: true
        }
      });
    } else {
      // Create new stock record
      stock = await prisma.stock.create({
        data: {
          productId,
          warehouseId,
          locationId: locationId || null,
          quantity,
          available: quantity,
          reserved: 0
        },
        include: {
          product: true,
          warehouse: true,
          location: true
        }
      });
    }

    // Create stock ledger entry if quantity changed
    if (quantityChange !== 0) {
      await prisma.stockLedger.create({
        data: {
          productId,
          warehouseId,
          locationId: locationId || null,
          transactionType: quantityChange > 0 ? 'IN' : 'OUT',
          referenceType: 'ADJUSTMENT',
          referenceId: 'MANUAL_UPDATE',
          quantityBefore: oldQuantity,
          quantityChange: quantityChange,
          quantityAfter: quantity,
          notes: 'Manual stock update from Products page'
        }
      });
    }

    res.json({
      message: 'Stock updated successfully',
      stock
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
};

module.exports = {
  updateStock
};

