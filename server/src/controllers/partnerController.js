const prisma = require('../utils/prismaClient');

// ============================================
// SUPPLIER CONTROLLERS
// ============================================

// Get all suppliers
const getSuppliers = async (req, res) => {
  try {
    const { isActive, search, page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          _count: {
            select: {
              receipts: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' }
      }),
      prisma.supplier.count({ where })
    ]);

    res.json({
      suppliers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
};

// Get supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        receipts: {
          include: {
            warehouse: true,
            items: {
              include: {
                product: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching supplier', error: error.message });
  }
};

// Create supplier
const createSupplier = async (req, res) => {
  try {
    const {
      name,
      code,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      contactPerson,
      taxId
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }

    // Check if code already exists
    const existingCode = await prisma.supplier.findUnique({
      where: { code }
    });

    if (existingCode) {
      return res.status(409).json({ message: 'Supplier code already exists' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        code,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        contactPerson,
        taxId
      }
    });

    res.status(201).json(supplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating supplier', error: error.message });
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!existingSupplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // If updating code, check if it's already taken
    if (updateData.code && updateData.code !== existingSupplier.code) {
      const codeExists = await prisma.supplier.findUnique({
        where: { code: updateData.code }
      });
      if (codeExists) {
        return res.status(409).json({ message: 'Supplier code already exists' });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData
    });

    res.json(supplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating supplier', error: error.message });
  }
};

// Delete supplier (soft delete)
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Supplier deleted successfully', supplier });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting supplier', error: error.message });
  }
};

// ============================================
// CUSTOMER CONTROLLERS
// ============================================

// Get all customers
const getCustomers = async (req, res) => {
  try {
    const { isActive, search, page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              deliveries: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' }
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      customers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        deliveries: {
          include: {
            warehouse: true,
            items: {
              include: {
                product: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching customer', error: error.message });
  }
};

// Create customer
const createCustomer = async (req, res) => {
  try {
    const {
      name,
      code,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      contactPerson,
      taxId
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }

    // Check if code already exists
    const existingCode = await prisma.customer.findUnique({
      where: { code }
    });

    if (existingCode) {
      return res.status(409).json({ message: 'Customer code already exists' });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        code,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        contactPerson,
        taxId
      }
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating customer', error: error.message });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // If updating code, check if it's already taken
    if (updateData.code && updateData.code !== existingCustomer.code) {
      const codeExists = await prisma.customer.findUnique({
        where: { code: updateData.code }
      });
      if (codeExists) {
        return res.status(409).json({ message: 'Customer code already exists' });
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData
    });

    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating customer', error: error.message });
  }
};

// Delete customer (soft delete)
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Customer deleted successfully', customer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting customer', error: error.message });
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
