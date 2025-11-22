const prisma = require('../utils/prismaClient');

// ============================================
// WAREHOUSE CONTROLLERS
// ============================================

// Get all warehouses
const getWarehouses = async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};
    
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        locations: true,
        _count: {
          select: {
            stock: true,
            receipts: true,
            deliveries: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(warehouses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching warehouses', error: error.message });
  }
};

// Get warehouse by ID
const getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: true,
        stock: {
          include: {
            product: true,
            location: true
          }
        }
      }
    });

    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    res.json(warehouse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching warehouse', error: error.message });
  }
};

// Create warehouse
const createWarehouse = async (req, res) => {
  try {
    const { name, code, address, city, state, zipCode, phone } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }

    // Check if code already exists
    const existingCode = await prisma.warehouse.findUnique({
      where: { code }
    });

    if (existingCode) {
      return res.status(409).json({ message: 'Warehouse code already exists' });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        code,
        address,
        city,
        state,
        zipCode,
        phone
      }
    });

    res.status(201).json(warehouse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating warehouse', error: error.message });
  }
};

// Update warehouse
const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: updateData,
      include: {
        locations: true
      }
    });

    res.json(warehouse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating warehouse', error: error.message });
  }
};

// Delete warehouse (soft delete)
const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Warehouse deleted successfully', warehouse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting warehouse', error: error.message });
  }
};

// ============================================
// LOCATION CONTROLLERS
// ============================================

// Get locations by warehouse
const getLocationsByWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { isActive } = req.query;
    const where = { warehouseId };
    
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const locations = await prisma.location.findMany({
      where,
      include: {
        warehouse: true,
        stock: {
          include: {
            product: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    res.json(locations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching locations', error: error.message });
  }
};

// Get location by ID
const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        warehouse: true,
        stock: {
          include: {
            product: true
          }
        }
      }
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching location', error: error.message });
  }
};

// Create location
const createLocation = async (req, res) => {
  try {
    const { name, code, type, warehouseId } = req.body;

    if (!name || !code || !warehouseId) {
      return res.status(400).json({ message: 'Name, code, and warehouse are required' });
    }

    // Check if location code exists in the same warehouse
    const existingLocation = await prisma.location.findFirst({
      where: {
        code,
        warehouseId
      }
    });

    if (existingLocation) {
      return res.status(409).json({ message: 'Location code already exists in this warehouse' });
    }

    const location = await prisma.location.create({
      data: {
        name,
        code,
        type: type || 'SHELF',
        warehouseId
      },
      include: {
        warehouse: true
      }
    });

    res.status(201).json(location);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating location', error: error.message });
  }
};

// Update location
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const location = await prisma.location.update({
      where: { id },
      data: updateData,
      include: {
        warehouse: true
      }
    });

    res.json(location);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating location', error: error.message });
  }
};

// Delete location (soft delete)
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await prisma.location.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Location deleted successfully', location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting location', error: error.message });
  }
};

// ============================================
// CATEGORY CONTROLLERS
// ============================================

// Get all categories
const getCategories = async (req, res) => {
  try {
    const { isActive } = req.query;
    const where = {};
    
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        parentId
      },
      include: {
        parent: true
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true
      }
    });

    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
};

// Delete category (soft delete)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Category deleted successfully', category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};

module.exports = {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getLocationsByWarehouse,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
