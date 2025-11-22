const prisma = require('../utils/prismaClient');

// Get all move history (flattened - each product line as separate row)
const getMoveHistory = async (req, res) => {
  try {
    const { search, status, type, page = 1, limit = 50 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Filter by transaction type (IN, OUT, TRANSFER, ADJUST)
    if (type) {
      where.transactionType = type;
    }

    // Fetch all stock ledger entries with related data
    const [ledgerEntries, total, allWarehouses, allLocations] = await Promise.all([
      prisma.stockLedger.findMany({
        where,
        include: {
          product: true,
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.stockLedger.count({ where }),
      prisma.warehouse.findMany({ where: { isActive: true } }),
      prisma.location.findMany({ where: { isActive: true } })
    ]);

    // Enrich with warehouse and location data
    const enrichedEntries = ledgerEntries.map(entry => ({
      ...entry,
      warehouse: allWarehouses.find(w => w.id === entry.warehouseId) || null,
      location: entry.locationId ? (allLocations.find(l => l.id === entry.locationId) || null) : null
    }));

    // Fetch related documents (Receipt, Delivery, Transfer, Adjustment) to get contact info
    const referenceIds = [...new Set(enrichedEntries.map(e => e.referenceId))];
    const referenceTypes = [...new Set(enrichedEntries.map(e => e.referenceType))];

    // Fetch receipts
    const receipts = referenceTypes.includes('RECEIPT') 
      ? await prisma.receipt.findMany({
          where: { id: { in: referenceIds } },
          include: { supplier: true, warehouse: true }
        })
      : [];

    // Fetch deliveries
    const deliveries = referenceTypes.includes('DELIVERY')
      ? await prisma.deliveryOrder.findMany({
          where: { id: { in: referenceIds } },
          include: { customer: true, warehouse: true }
        })
      : [];

    // Fetch transfers
    const transfers = referenceTypes.includes('TRANSFER')
      ? await prisma.internalTransfer.findMany({
          where: { id: { in: referenceIds } },
          include: { 
            fromWarehouse: true, 
            toWarehouse: true,
            fromLocation: true,
            toLocation: true
          }
        })
      : [];

    // Fetch adjustments
    const adjustments = referenceTypes.includes('ADJUSTMENT')
      ? await prisma.stockAdjustment.findMany({
          where: { id: { in: referenceIds } },
          include: { warehouse: true }
        })
      : [];

    // Build flattened move history rows
    const moveHistory = enrichedEntries.map(entry => {
      let reference = '';
      let contact = null;
      let contactName = '';
      let fromLocation = '';
      let toLocation = '';
      let moveStatus = 'DONE'; // Default status
      let movementDirection = entry.transactionType === 'IN' ? 'IN' : 
                             entry.transactionType === 'OUT' ? 'OUT' : 
                             entry.transactionType === 'TRANSFER' ? 'TRANSFER' : 'ADJUST';

      // Determine reference, contact, and locations based on reference type
      switch (entry.referenceType) {
        case 'RECEIPT': {
          const receipt = receipts.find(r => r.id === entry.referenceId);
          if (receipt) {
            reference = receipt.receiptNumber;
            contact = receipt.supplier;
            contactName = receipt.supplier?.name || 'N/A';
            fromLocation = 'vendor';
            toLocation = receipt.warehouse?.name || entry.warehouse?.name || 'N/A';
            moveStatus = receipt.status;
            movementDirection = 'IN';
          }
          break;
        }
        case 'DELIVERY': {
          const delivery = deliveries.find(d => d.id === entry.referenceId);
          if (delivery) {
            reference = delivery.deliveryNumber;
            contact = delivery.customer;
            contactName = delivery.customer?.name || 'N/A';
            fromLocation = delivery.warehouse?.name || entry.warehouse?.name || 'N/A';
            toLocation = 'vendor';
            moveStatus = delivery.status;
            movementDirection = 'OUT';
          }
          break;
        }
        case 'TRANSFER': {
          const transfer = transfers.find(t => t.id === entry.referenceId);
          if (transfer) {
            reference = transfer.transferNumber;
            contactName = 'Internal Transfer';
            fromLocation = transfer.fromWarehouse?.name || 'N/A';
            if (transfer.fromLocation) {
              fromLocation += ` / ${transfer.fromLocation.name}`;
            }
            toLocation = transfer.toWarehouse?.name || 'N/A';
            if (transfer.toLocation) {
              toLocation += ` / ${transfer.toLocation.name}`;
            }
            moveStatus = transfer.status;
            movementDirection = 'TRANSFER';
          }
          break;
        }
        case 'ADJUSTMENT': {
          const adjustment = adjustments.find(a => a.id === entry.referenceId);
          if (adjustment) {
            reference = adjustment.adjustmentNumber;
            contactName = 'Stock Adjustment';
            fromLocation = adjustment.warehouse?.name || entry.warehouse?.name || 'N/A';
            toLocation = adjustment.warehouse?.name || entry.warehouse?.name || 'N/A';
            moveStatus = adjustment.status;
            movementDirection = 'ADJUST';
          }
          break;
        }
        case 'INITIAL': {
          reference = `INIT-${entry.referenceId.slice(0, 8)}`;
          contactName = 'Initial Stock';
          fromLocation = 'vendor';
          toLocation = entry.warehouse?.name || 'N/A';
          moveStatus = 'DONE';
          movementDirection = 'IN';
          break;
        }
      }

      // Format reference for display (e.g., WH/IN/0001, WH/OUT/0002)
      let displayReference = reference;
      if (entry.referenceType === 'RECEIPT') {
        // Extract number from REC-YYYYMM-0001 format
        const match = reference.match(/REC-\d{6}-(\d+)/);
        if (match) {
          displayReference = `WH/IN/${match[1]}`;
        } else {
          displayReference = reference.replace('REC-', 'WH/IN/');
        }
      } else if (entry.referenceType === 'DELIVERY') {
        // Extract number from DEL-YYYYMM-0001 format
        const match = reference.match(/DEL-\d{6}-(\d+)/);
        if (match) {
          displayReference = `WH/OUT/${match[1]}`;
        } else {
          displayReference = reference.replace('DEL-', 'WH/OUT/');
        }
      } else if (entry.referenceType === 'TRANSFER') {
        // Extract number from TRF-YYYYMM-0001 format
        const match = reference.match(/TRF-\d{6}-(\d+)/);
        if (match) {
          displayReference = `WH/TRF/${match[1]}`;
        } else {
          displayReference = reference.replace('TRF-', 'WH/TRF/');
        }
      } else if (entry.referenceType === 'ADJUSTMENT') {
        // Extract number from ADJ-YYYYMM-0001 format
        const match = reference.match(/ADJ-\d{6}-(\d+)/);
        if (match) {
          displayReference = `WH/ADJ/${match[1]}`;
        } else {
          displayReference = reference.replace('ADJ-', 'WH/ADJ/');
        }
      }

      return {
        id: entry.id,
        reference: displayReference,
        referenceId: entry.referenceId,
        referenceType: entry.referenceType,
        date: entry.createdAt,
        contact: contactName,
        contactId: contact?.id || null,
        from: fromLocation,
        to: toLocation,
        quantity: Math.abs(entry.quantityChange),
        status: moveStatus,
        movementDirection,
        product: entry.product,
        productId: entry.productId,
        warehouse: entry.warehouse,
        location: entry.location,
        notes: entry.notes
      };
    });

    // Apply search filter if provided
    let filteredMoves = moveHistory;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMoves = moveHistory.filter(move => 
        move.reference.toLowerCase().includes(searchLower) ||
        move.contact.toLowerCase().includes(searchLower) ||
        move.product?.name.toLowerCase().includes(searchLower) ||
        move.product?.sku.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter if provided
    if (status) {
      filteredMoves = filteredMoves.filter(move => move.status === status);
    }

    res.json({
      moves: filteredMoves,
      pagination: {
        total: filteredMoves.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredMoves.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching move history:', error);
    res.status(500).json({ message: 'Error fetching move history', error: error.message });
  }
};

module.exports = {
  getMoveHistory
};

