const prisma = require('../utils/prismaClient');

// Helper function to generate SKU
const generateSKU = async () => {
  // Find the last product with a SKU that matches the pattern PROD-XXXXXX
  const lastProduct = await prisma.product.findFirst({
    where: {
      sku: {
        startsWith: 'PROD-'
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let sequence = 1;
  if (lastProduct && lastProduct.sku) {
    // Extract sequence number from SKU (e.g., PROD-000001 -> 1)
    const match = lastProduct.sku.match(/PROD-(\d+)/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }

  // Format as PROD-000001, PROD-000002, etc.
  return `PROD-${String(sequence).padStart(6, '0')}`;
};

// Get all products with filters
const getProducts = async (req, res) => {
  try {
    const { category, search, isActive, page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (category) where.categoryId = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          stock: {
            include: {
              warehouse: true,
              location: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stock: {
          include: {
            warehouse: true,
            location: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      categoryId,
      unitOfMeasure,
      minStock,
      maxStock,
      reorderPoint,
      reorderQuantity,
      unitPrice,
      barcode,
      image,
      initialStock,
      initialWarehouseId,
      initialLocationId
    } = req.body;

    // Validate reorder point is provided
    if (reorderPoint === undefined || reorderPoint === null) {
      return res.status(400).json({ message: 'Reorder point is required' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    // Use provided SKU or generate automatically
    let sku = req.body.sku;
    if (!sku) {
      sku = await generateSKU();
    } else {
      // Validate that provided SKU doesn't already exist
      const existingSku = await prisma.product.findUnique({
        where: { sku }
      });

      if (existingSku) {
        return res.status(409).json({ message: 'SKU already exists' });
      }
    }

    // Create product with initial stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create product
      const product = await tx.product.create({
        data: {
          name,
          sku,
          description,
          categoryId,
          unitOfMeasure: unitOfMeasure || 'Units',
          minStock: minStock || 0,
          maxStock,
          reorderPoint: reorderPoint || 0,
          reorderQuantity: reorderQuantity || 0,
          unitPrice: unitPrice || 0,
          barcode,
          image
        }
      });

      // Create initial stock if provided
      if (initialStock && initialStock > 0 && initialWarehouseId) {
        // Check if stock already exists for this product/warehouse/location combination
        const existingStock = await tx.stock.findFirst({
          where: {
            productId: product.id,
            warehouseId: initialWarehouseId,
            locationId: initialLocationId || null
          }
        });

        if (existingStock) {
          // Update existing stock
          await tx.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: existingStock.quantity + initialStock,
              available: existingStock.available + initialStock
            }
          });
        } else {
          // Create new stock entry
          await tx.stock.create({
            data: {
              productId: product.id,
              warehouseId: initialWarehouseId,
              locationId: initialLocationId || null,
              quantity: initialStock,
              available: initialStock,
              reserved: 0
            }
          });
        }

        // Create stock ledger entry for initial stock
        await tx.stockLedger.create({
          data: {
            productId: product.id,
            warehouseId: initialWarehouseId,
            locationId: initialLocationId || null,
            transactionType: 'IN',
            referenceType: 'INITIAL',
            referenceId: product.id,
            quantityBefore: 0,
            quantityChange: initialStock,
            quantityAfter: initialStock,
            notes: `Initial stock for product ${product.name}`
          }
        });
      }

      // Fetch product with relations
      return await tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          stock: {
            include: {
              warehouse: true,
              location: true
            }
          }
        }
      });
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // If updating SKU, check if it's already taken by another product
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: updateData.sku }
      });
      if (skuExists) {
        return res.status(409).json({ message: 'SKU already exists' });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        stock: {
          include: {
            warehouse: true,
            location: true
          }
        }
      }
    });

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

// Delete product (soft delete by setting isActive to false)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Product deleted successfully', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
};

// Get next SKU (preview for new product)
const getNextSKU = async (req, res) => {
  try {
    const sku = await generateSKU();
    res.json({ sku });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating SKU', error: error.message });
  }
};

// Get low stock products
const getLowStockProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true
      },
      include: {
        category: true,
        stock: {
          include: {
            warehouse: true
          }
        }
      }
    });

    // Filter products where total stock is below reorder point
    const lowStockProducts = products.filter(product => {
      const totalStock = product.stock.reduce((sum, s) => sum + s.available, 0);
      return totalStock <= product.reorderPoint;
    });

    res.json(lowStockProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching low stock products', error: error.message });
  }
};

// Get stock by warehouse for a product
const getStockByWarehouse = async (req, res) => {
  try {
    const { productId } = req.params;
    const { warehouseId } = req.query;

    const where = {
      productId
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const stock = await prisma.stock.findMany({
      where,
      include: {
        warehouse: true,
        location: true,
        product: {
          include: {
            category: true
          }
        }
      },
      orderBy: [
        { warehouse: { name: 'asc' } },
        { location: { name: 'asc' } }
      ]
    });

    // Aggregate by warehouse
    const stockByWarehouse = stock.reduce((acc, item) => {
      const warehouseId = item.warehouseId;
      if (!acc[warehouseId]) {
        acc[warehouseId] = {
          warehouse: item.warehouse,
          totalQuantity: 0,
          totalAvailable: 0,
          totalReserved: 0,
          locations: []
        };
      }
      acc[warehouseId].totalQuantity += item.quantity;
      acc[warehouseId].totalAvailable += item.available;
      acc[warehouseId].totalReserved += item.reserved;
      
      if (item.location) {
        acc[warehouseId].locations.push({
          location: item.location,
          quantity: item.quantity,
          available: item.available,
          reserved: item.reserved
        });
      }
      return acc;
    }, {});

    res.json({
      product: stock[0]?.product || null,
      stockByWarehouse: Object.values(stockByWarehouse),
      rawStock: stock
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stock by warehouse', error: error.message });
  }
};

// Get stock by location for a product
const getStockByLocation = async (req, res) => {
  try {
    const { productId } = req.params;
    const { warehouseId, locationId } = req.query;

    const where = {
      productId
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const stock = await prisma.stock.findMany({
      where,
      include: {
        warehouse: true,
        location: true,
        product: {
          include: {
            category: true
          }
        }
      },
      orderBy: [
        { warehouse: { name: 'asc' } },
        { location: { name: 'asc' } }
      ]
    });

    // Aggregate by location
    const stockByLocation = stock.reduce((acc, item) => {
      const locationKey = item.locationId || 'no-location';
      if (!acc[locationKey]) {
        acc[locationKey] = {
          location: item.location,
          warehouse: item.warehouse,
          totalQuantity: 0,
          totalAvailable: 0,
          totalReserved: 0
        };
      }
      acc[locationKey].totalQuantity += item.quantity;
      acc[locationKey].totalAvailable += item.available;
      acc[locationKey].totalReserved += item.reserved;
      return acc;
    }, {});

    res.json({
      product: stock[0]?.product || null,
      stockByLocation: Object.values(stockByLocation),
      rawStock: stock
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stock by location', error: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getStockByWarehouse,
  getStockByLocation,
  getNextSKU
};
