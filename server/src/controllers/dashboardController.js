const prisma = require('../utils/prismaClient');

// Get dashboard KPIs and statistics
const getDashboardKPIs = async (req, res) => {
  try {
    const { warehouseId } = req.query;

    // Build where clause for warehouse filter
    const warehouseFilter = warehouseId ? { warehouseId } : {};

    // Get total products in stock
    const totalProductsInStock = await prisma.product.count({
      where: { isActive: true }
    });

    // Get low stock products
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        stock: {
          where: warehouseFilter,
          include: {
            warehouse: true
          }
        }
      }
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(product => {
      const totalStock = product.stock.reduce((sum, s) => sum + s.available, 0);
      if (totalStock === 0) {
        outOfStockCount++;
      } else if (totalStock <= product.reorderPoint) {
        lowStockCount++;
      }
    });

    // Get pending receipts
    const pendingReceipts = await prisma.receipt.count({
      where: {
        ...warehouseFilter,
        status: {
          in: ['DRAFT', 'WAITING', 'READY']
        }
      }
    });

    // Get pending deliveries
    const pendingDeliveries = await prisma.deliveryOrder.count({
      where: {
        ...warehouseFilter,
        status: {
          in: ['DRAFT', 'WAITING', 'READY']
        }
      }
    });

    // Get scheduled internal transfers
    const scheduledTransfers = await prisma.internalTransfer.count({
      where: {
        OR: [
          { fromWarehouseId: warehouseId },
          { toWarehouseId: warehouseId }
        ],
        status: {
          in: ['DRAFT', 'WAITING', 'READY']
        }
      }
    });

    // Get recent activities (last 10 transactions)
    const recentActivities = await prisma.stockLedger.findMany({
      where: warehouseFilter,
      include: {
        product: true
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Document status breakdown
    const [receiptsByStatus, deliveriesByStatus, transfersByStatus, adjustmentsByStatus] = await Promise.all([
      prisma.receipt.groupBy({
        by: ['status'],
        where: warehouseFilter,
        _count: true
      }),
      prisma.deliveryOrder.groupBy({
        by: ['status'],
        where: warehouseFilter,
        _count: true
      }),
      prisma.internalTransfer.groupBy({
        by: ['status'],
        where: warehouseId ? {
          OR: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId }
          ]
        } : {},
        _count: true
      }),
      prisma.stockAdjustment.groupBy({
        by: ['status'],
        where: warehouseFilter,
        _count: true
      })
    ]);

    // Total stock value
    const stockWithProducts = await prisma.stock.findMany({
      where: warehouseFilter,
      include: {
        product: true
      }
    });

    const totalStockValue = stockWithProducts.reduce(
      (sum, stock) => sum + (stock.quantity * stock.product.unitPrice),
      0
    );

    res.json({
      kpis: {
        totalProductsInStock,
        lowStockCount,
        outOfStockCount,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers,
        totalStockValue
      },
      statusBreakdown: {
        receipts: receiptsByStatus,
        deliveries: deliveriesByStatus,
        transfers: transfersByStatus,
        adjustments: adjustmentsByStatus
      },
      recentActivities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
};

// Get stock overview by warehouse
const getStockOverview = async (req, res) => {
  try {
    const { warehouseId, categoryId } = req.query;

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const productWhere = {};
    if (categoryId) productWhere.categoryId = categoryId;

    const stockData = await prisma.stock.findMany({
      where,
      include: {
        product: {
          where: productWhere,
          include: {
            category: true
          }
        },
        warehouse: true,
        location: true
      }
    });

    // Group by product
    const stockByProduct = stockData.reduce((acc, stock) => {
      const productId = stock.productId;
      if (!acc[productId]) {
        acc[productId] = {
          product: stock.product,
          totalQuantity: 0,
          totalAvailable: 0,
          totalReserved: 0,
          warehouses: []
        };
      }
      acc[productId].totalQuantity += stock.quantity;
      acc[productId].totalAvailable += stock.available;
      acc[productId].totalReserved += stock.reserved;
      acc[productId].warehouses.push({
        warehouse: stock.warehouse,
        location: stock.location,
        quantity: stock.quantity,
        available: stock.available,
        reserved: stock.reserved
      });
      return acc;
    }, {});

    res.json({
      stockOverview: Object.values(stockByProduct)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stock overview', error: error.message });
  }
};

// Get document statistics
const getDocumentStatistics = async (req, res) => {
  try {
    const { warehouseId, startDate, endDate } = req.query;

    const warehouseFilter = warehouseId ? { warehouseId } : {};
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [receiptsStats, deliveriesStats, transfersStats, adjustmentsStats] = await Promise.all([
      prisma.receipt.groupBy({
        by: ['status'],
        where: {
          ...warehouseFilter,
          ...dateFilter
        },
        _count: true,
        _sum: {
          // You can add sum fields if needed
        }
      }),
      prisma.deliveryOrder.groupBy({
        by: ['status'],
        where: {
          ...warehouseFilter,
          ...dateFilter
        },
        _count: true
      }),
      prisma.internalTransfer.groupBy({
        by: ['status'],
        where: {
          ...dateFilter,
          ...(warehouseId ? {
            OR: [
              { fromWarehouseId: warehouseId },
              { toWarehouseId: warehouseId }
            ]
          } : {})
        },
        _count: true
      }),
      prisma.stockAdjustment.groupBy({
        by: ['status'],
        where: {
          ...warehouseFilter,
          ...dateFilter
        },
        _count: true
      })
    ]);

    res.json({
      receipts: receiptsStats,
      deliveries: deliveriesStats,
      transfers: transfersStats,
      adjustments: adjustmentsStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching document statistics', error: error.message });
  }
};

// Get top products by movement
const getTopProducts = async (req, res) => {
  try {
    const { warehouseId, limit = 10, transactionType } = req.query;

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (transactionType) where.transactionType = transactionType;

    // Get stock ledger entries and aggregate by product
    const ledgerEntries = await prisma.stockLedger.findMany({
      where,
      include: {
        product: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Aggregate by product
    const productMovement = ledgerEntries.reduce((acc, entry) => {
      const productId = entry.productId;
      if (!acc[productId]) {
        acc[productId] = {
          product: entry.product,
          totalMovement: 0,
          inbound: 0,
          outbound: 0,
          transactionCount: 0
        };
      }
      acc[productId].totalMovement += Math.abs(entry.quantityChange);
      if (entry.transactionType === 'IN') {
        acc[productId].inbound += entry.quantityChange;
      } else if (entry.transactionType === 'OUT') {
        acc[productId].outbound += Math.abs(entry.quantityChange);
      }
      acc[productId].transactionCount++;
      return acc;
    }, {});

    // Sort by total movement and limit
    const topProducts = Object.values(productMovement)
      .sort((a, b) => b.totalMovement - a.totalMovement)
      .slice(0, parseInt(limit));

    res.json({
      topProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching top products', error: error.message });
  }
};

// Get alerts (low stock, out of stock, pending documents)
const getAlerts = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const warehouseFilter = warehouseId ? { warehouseId } : {};

    // Get products with low stock or out of stock
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        stock: {
          where: warehouseFilter,
          include: {
            warehouse: true
          }
        },
        category: true
      }
    });

    const lowStockAlerts = [];
    const outOfStockAlerts = [];

    products.forEach(product => {
      const totalStock = product.stock.reduce((sum, s) => sum + s.available, 0);
      if (totalStock === 0) {
        outOfStockAlerts.push({
          type: 'OUT_OF_STOCK',
          severity: 'CRITICAL',
          product,
          message: `${product.name} is out of stock`
        });
      } else if (totalStock <= product.reorderPoint) {
        lowStockAlerts.push({
          type: 'LOW_STOCK',
          severity: 'WARNING',
          product,
          currentStock: totalStock,
          reorderPoint: product.reorderPoint,
          message: `${product.name} is below reorder point (${totalStock} / ${product.reorderPoint})`
        });
      }
    });

    // Get overdue documents
    const today = new Date();
    const [overdueReceipts, overdueDeliveries, overdueTransfers] = await Promise.all([
      prisma.receipt.findMany({
        where: {
          ...warehouseFilter,
          scheduledDate: { lt: today },
          status: { in: ['DRAFT', 'WAITING', 'READY'] }
        },
        include: {
          supplier: true,
          warehouse: true
        }
      }),
      prisma.deliveryOrder.findMany({
        where: {
          ...warehouseFilter,
          scheduledDate: { lt: today },
          status: { in: ['DRAFT', 'WAITING', 'READY'] }
        },
        include: {
          customer: true,
          warehouse: true
        }
      }),
      prisma.internalTransfer.findMany({
        where: {
          ...(warehouseId ? {
            OR: [
              { fromWarehouseId: warehouseId },
              { toWarehouseId: warehouseId }
            ]
          } : {}),
          scheduledDate: { lt: today },
          status: { in: ['DRAFT', 'WAITING', 'READY'] }
        },
        include: {
          fromWarehouse: true,
          toWarehouse: true
        }
      })
    ]);

    const overdueAlerts = [
      ...overdueReceipts.map(r => ({
        type: 'OVERDUE_RECEIPT',
        severity: 'HIGH',
        document: r,
        message: `Receipt ${r.receiptNumber} is overdue`
      })),
      ...overdueDeliveries.map(d => ({
        type: 'OVERDUE_DELIVERY',
        severity: 'HIGH',
        document: d,
        message: `Delivery ${d.deliveryNumber} is overdue`
      })),
      ...overdueTransfers.map(t => ({
        type: 'OVERDUE_TRANSFER',
        severity: 'MEDIUM',
        document: t,
        message: `Transfer ${t.transferNumber} is overdue`
      }))
    ];

    res.json({
      alerts: [
        ...outOfStockAlerts,
        ...lowStockAlerts,
        ...overdueAlerts
      ],
      summary: {
        critical: outOfStockAlerts.length,
        high: overdueAlerts.filter(a => a.severity === 'HIGH').length,
        warning: lowStockAlerts.length,
        medium: overdueAlerts.filter(a => a.severity === 'MEDIUM').length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching alerts', error: error.message });
  }
};

module.exports = {
  getDashboardKPIs,
  getStockOverview,
  getDocumentStatistics,
  getTopProducts,
  getAlerts
};
