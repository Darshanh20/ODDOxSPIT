const prisma = require('../utils/prismaClient');

// Get staff statistics
const getStaffStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { warehouse: true }
    });

    if (!user || !user.warehouseId) {
      return res.status(400).json({ message: 'User warehouse not assigned' });
    }

    const warehouseId = user.warehouseId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pending tasks (unassigned or assigned to this user)
    const pendingReceipts = await prisma.receipt.count({
      where: {
        warehouseId,
        status: { in: ['DRAFT', 'READY', 'WAITING'] },
        OR: [
          { assignedToId: null },
          { assignedToId: userId }
        ]
      }
    });

    const pendingDeliveries = await prisma.deliveryOrder.count({
      where: {
        warehouseId,
        status: { in: ['DRAFT', 'READY', 'WAITING'] },
        OR: [
          { assignedToId: null },
          { assignedToId: userId }
        ]
      }
    });

    const pendingTransfers = await prisma.internalTransfer.count({
      where: {
        OR: [
          { fromWarehouseId: warehouseId },
          { toWarehouseId: warehouseId }
        ],
        status: { in: ['DRAFT', 'READY', 'WAITING'] },
        OR: [
          { assignedToId: null },
          { assignedToId: userId }
        ]
      }
    });

    const pendingTasks = pendingReceipts + pendingDeliveries + pendingTransfers;

    // Accepted today
    const acceptedToday = await prisma.receipt.count({
      where: {
        acceptedById: userId,
        acceptedAt: {
          gte: today
        }
      }
    }) + await prisma.deliveryOrder.count({
      where: {
        acceptedById: userId,
        acceptedAt: {
          gte: today
        }
      }
    }) + await prisma.internalTransfer.count({
      where: {
        acceptedById: userId,
        acceptedAt: {
          gte: today
        }
      }
    });

    // Delivered today (completed deliveries)
    const deliveredToday = await prisma.deliveryOrder.count({
      where: {
        completedById: userId,
        status: 'DONE',
        completedAt: {
          gte: today
        }
      }
    });

    // Total completed
    const totalCompleted = await prisma.receipt.count({
      where: {
        completedById: userId,
        status: 'DONE'
      }
    }) + await prisma.deliveryOrder.count({
      where: {
        completedById: userId,
        status: 'DONE'
      }
    }) + await prisma.internalTransfer.count({
      where: {
        completedById: userId,
        status: 'DONE'
      }
    });

    res.json({
      pendingTasks,
      acceptedToday,
      deliveredToday,
      totalCompleted
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching staff stats', error: error.message });
  }
};

// Get pending tasks
const getPendingTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { warehouse: true }
    });

    if (!user || !user.warehouseId) {
      return res.status(400).json({ message: 'User warehouse not assigned' });
    }

    const warehouseId = user.warehouseId;
    const tasks = [];

    // Get pending receipts
    const receipts = await prisma.receipt.findMany({
      where: {
        warehouseId,
        status: { in: ['DRAFT', 'READY', 'WAITING'] },
        OR: [
          { assignedToId: null },
          { assignedToId: userId }
        ]
      },
      include: {
        supplier: true,
        warehouse: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    receipts.forEach(receipt => {
      tasks.push({
        id: receipt.id,
        type: 'receipt',
        reference: receipt.receiptNumber,
        from: receipt.supplier?.name || 'N/A',
        to: receipt.warehouse?.code || 'N/A',
        itemsCount: 0, // Will be populated if needed
        priority: 'MEDIUM',
        status: receipt.status
      });
    });

    // Get pending deliveries
    const deliveries = await prisma.deliveryOrder.findMany({
      where: {
        warehouseId,
        status: { in: ['DRAFT', 'READY', 'WAITING'] },
        OR: [
          { assignedToId: null },
          { assignedToId: userId }
        ]
      },
      include: {
        customer: true,
        warehouse: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    deliveries.forEach(delivery => {
      tasks.push({
        id: delivery.id,
        type: 'delivery',
        reference: delivery.deliveryNumber,
        from: delivery.warehouse?.code || 'N/A',
        to: delivery.customer?.name || delivery.shippingAddress?.replace('Vendor: ', '') || 'N/A',
        itemsCount: 0,
        priority: 'MEDIUM',
        status: delivery.status
      });
    });

    // Get pending transfers
    const transfers = await prisma.internalTransfer.findMany({
      where: {
        OR: [
          { fromWarehouseId: warehouseId },
          { toWarehouseId: warehouseId }
        ],
        status: { in: ['DRAFT', 'READY', 'WAITING'] },
        OR: [
          { assignedToId: null },
          { assignedToId: userId }
        ]
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        fromLocation: true,
        toLocation: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    transfers.forEach(transfer => {
      tasks.push({
        id: transfer.id,
        type: 'transfer',
        reference: transfer.transferNumber,
        from: transfer.fromLocation?.name || transfer.fromWarehouse?.code || 'N/A',
        to: transfer.toLocation?.name || transfer.toWarehouse?.code || 'N/A',
        itemsCount: 0,
        priority: 'LOW',
        status: transfer.status
      });
    });

    res.json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching pending tasks', error: error.message });
  }
};

// Get active tasks (accepted by user)
const getActiveTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const tasks = [];

    // Get active receipts
    const receipts = await prisma.receipt.findMany({
      where: {
        acceptedById: userId,
        status: { in: ['DRAFT', 'READY', 'WAITING'] }
      },
      include: {
        supplier: true,
        warehouse: true
      },
      orderBy: { acceptedAt: 'desc' }
    });

    receipts.forEach(receipt => {
      tasks.push({
        id: receipt.id,
        type: 'receipt',
        reference: receipt.receiptNumber,
        status: receipt.status,
        acceptedAt: receipt.acceptedAt
      });
    });

    // Get active deliveries
    const deliveries = await prisma.deliveryOrder.findMany({
      where: {
        acceptedById: userId,
        status: { in: ['DRAFT', 'READY', 'WAITING'] }
      },
      include: {
        customer: true,
        warehouse: true
      },
      orderBy: { acceptedAt: 'desc' }
    });

    deliveries.forEach(delivery => {
      tasks.push({
        id: delivery.id,
        type: 'delivery',
        reference: delivery.deliveryNumber,
        status: delivery.status,
        acceptedAt: delivery.acceptedAt
      });
    });

    // Get active transfers
    const transfers = await prisma.internalTransfer.findMany({
      where: {
        acceptedById: userId,
        status: { in: ['DRAFT', 'READY', 'WAITING'] }
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true
      },
      orderBy: { acceptedAt: 'desc' }
    });

    transfers.forEach(transfer => {
      tasks.push({
        id: transfer.id,
        type: 'transfer',
        reference: transfer.transferNumber,
        status: transfer.status,
        acceptedAt: transfer.acceptedAt
      });
    });

    res.json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching active tasks', error: error.message });
  }
};

// Create activity log helper
const createActivityLog = async (taskType, taskId, reference, action, performedById, details) => {
  try {
    await prisma.activityLog.create({
      data: {
        taskType,
        taskId,
        reference,
        action,
        performedById,
        details
      }
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
};

module.exports = {
  getStaffStats,
  getPendingTasks,
  getActiveTasks,
  createActivityLog
};

