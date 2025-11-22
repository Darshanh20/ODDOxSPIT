const prisma = require('../utils/prismaClient');

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
      sku,
      description,
      categoryId,
      unitOfMeasure,
      minStock,
      maxStock,
      reorderPoint,
      reorderQuantity,
      unitPrice,
      barcode,
      image
    } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ message: 'Name and SKU are required' });
    }

    // Check if SKU already exists
    const existingSku = await prisma.product.findUnique({
      where: { sku }
    });

    if (existingSku) {
      return res.status(409).json({ message: 'SKU already exists' });
    }

    const product = await prisma.product.create({
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
      },
      include: {
        category: true
      }
    });

    res.status(201).json(product);
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

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts
};
