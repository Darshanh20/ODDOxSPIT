const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');

// Generate employee ID
const generateEmployeeId = async () => {
  const lastStaff = await prisma.user.findFirst({
    where: {
      employeeId: { not: null }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let sequence = 1;
  if (lastStaff && lastStaff.employeeId) {
    const lastSequence = parseInt(lastStaff.employeeId.replace('EMP-', ''));
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `EMP-${String(sequence).padStart(3, '0')}`;
};

// Generate random password
const generateRandomPassword = (length = 10) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Get all staff members
const getStaffMembers = async (req, res) => {
  try {
    const { warehouseId, status, search } = req.query;

    const where = {
      role: 'STAFF'
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const staff = await prisma.user.findMany({
      where,
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        staffPermissions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(staff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching staff members', error: error.message });
  }
};

// Get staff member by ID
const getStaffMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await prisma.user.findUnique({
      where: { id },
      include: {
        warehouse: true,
        staffPermissions: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!staff || staff.role !== 'STAFF') {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json(staff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching staff member', error: error.message });
  }
};

// Create new staff member
const createStaffMember = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      warehouseId,
      designation,
      joiningDate,
      username,
      password,
      autoGeneratePassword,
      employeeId,
      canReceipt = true,
      canDelivery = true,
      canTransfer = true,
      canAdjust = false
    } = req.body;

    const currentUserId = req.user.id;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!warehouseId || !warehouseId.trim()) {
      return res.status(400).json({ message: 'Warehouse is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Validate and set username
    let finalUsername = username || email;
    // If username is email and too long, use a shortened version or just email
    // Remove username length validation for email-based usernames
    if (finalUsername.length > 50) {
      finalUsername = email; // Use email as username if custom username is too long
    }

    // Check if username already exists (if not using email)
    if (username && username !== email) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: finalUsername }
      });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Generate employee ID if not provided
    let finalEmployeeId = employeeId;
    if (!finalEmployeeId || finalEmployeeId.trim() === '') {
      finalEmployeeId = await generateEmployeeId();
    } else {
      // Check if employee ID already exists
      const existingEmployeeId = await prisma.user.findUnique({
        where: { employeeId: finalEmployeeId }
      });
      if (existingEmployeeId) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    // Generate or use provided password
    let finalPassword = password;
    if (autoGeneratePassword || !password || password.trim() === '') {
      finalPassword = generateRandomPassword();
    }

    if (!finalPassword || finalPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Create staff member
    const result = await prisma.$transaction(async (tx) => {
      const newStaff = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          username: finalUsername.trim(),
          password: hashedPassword,
          role: 'STAFF',
          employeeId: finalEmployeeId,
          warehouseId: warehouseId.trim(),
          designation: designation ? designation.trim() : null,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          status: 'active',
          createdById: currentUserId
        }
      });

      // Create permissions (if table exists)
      try {
        // Check if StaffPermissions model exists by trying to find first
        const permCheck = await tx.staffPermissions.findFirst({ take: 1 }).catch(() => null);
        if (permCheck !== null) {
          await tx.staffPermissions.create({
            data: {
              userId: newStaff.id,
              canReceipt,
              canDelivery,
              canTransfer,
              canAdjust
            }
          });
        }
      } catch (permError) {
        console.warn('Permissions table may not exist yet. Staff created without permissions. Run migration to enable permissions.');
        // Continue without permissions - staff can still be created
      }

      return { ...newStaff, plainPassword: finalPassword };
    });

    // Remove password from response
    const { password: _, ...staffResponse } = result;

    res.status(201).json({
      ...staffResponse,
      message: autoGeneratePassword || !password 
        ? `Staff account created. Password: ${finalPassword}` 
        : 'Staff account created successfully'
    });
  } catch (error) {
    console.error('Error creating staff member:', error);
    console.error('Error details:', {
      code: error.code,
      meta: error.meta,
      message: error.message,
      stack: error.stack
    });
    
    // Provide more specific error messages
    if (error.code === 'P2002') {
      // Unique constraint violation
      const target = error.meta?.target || [];
      if (target.includes('email') || error.message?.includes('email')) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      if (target.includes('username') || error.message?.includes('username')) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      if (target.includes('employeeId') || error.message?.includes('employeeId')) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
      return res.status(400).json({ message: 'A record with this information already exists' });
    }
    
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      const fieldName = error.meta?.field_name || 'field';
      if (fieldName.includes('warehouse')) {
        return res.status(400).json({ message: 'Invalid warehouse selected. Please select a valid warehouse.' });
      }
      return res.status(400).json({ message: `Invalid ${fieldName} selected` });
    }
    
    // Handle Prisma validation errors
    if (error.code === 'P2012') {
      return res.status(400).json({ message: 'Missing required field. Please fill all required fields.' });
    }
    
    // Return user-friendly error message
    const errorMessage = error.message || 'Error creating staff member';
    res.status(500).json({ 
      message: errorMessage.includes('Unique constraint') 
        ? 'This email, username, or employee ID already exists'
        : errorMessage.includes('Foreign key')
        ? 'Invalid warehouse selected'
        : errorMessage.includes('column') && errorMessage.includes('does not exist')
        ? 'Database migration required. Please run: npx prisma migrate dev'
        : errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update staff member
const updateStaffMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      warehouseId,
      designation,
      status,
      canReceipt,
      canDelivery,
      canTransfer,
      canAdjust
    } = req.body;

    // Check if staff exists
    const existingStaff = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingStaff || existingStaff.role !== 'STAFF') {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update staff
      const updatedStaff = await tx.user.update({
        where: { id },
        data: {
          name,
          phone,
          warehouseId,
          designation,
          status
        },
        include: {
          warehouse: true,
          staffPermissions: true
        }
      });

      // Update permissions
      if (canReceipt !== undefined || canDelivery !== undefined || 
          canTransfer !== undefined || canAdjust !== undefined) {
        await tx.staffPermissions.upsert({
          where: { userId: id },
          create: {
            userId: id,
            canReceipt: canReceipt ?? true,
            canDelivery: canDelivery ?? true,
            canTransfer: canTransfer ?? true,
            canAdjust: canAdjust ?? false
          },
          update: {
            canReceipt: canReceipt !== undefined ? canReceipt : undefined,
            canDelivery: canDelivery !== undefined ? canDelivery : undefined,
            canTransfer: canTransfer !== undefined ? canTransfer : undefined,
            canAdjust: canAdjust !== undefined ? canAdjust : undefined
          }
        });
      }

      // If disabling, unassign pending tasks
      if (status === 'inactive' && existingStaff.status === 'active') {
        await tx.receipt.updateMany({
          where: {
            assignedToId: id,
            status: { notIn: ['DONE', 'CANCELED'] }
          },
          data: {
            assignedToId: null
          }
        });

        await tx.deliveryOrder.updateMany({
          where: {
            assignedToId: id,
            status: { notIn: ['DONE', 'CANCELED'] }
          },
          data: {
            assignedToId: null
          }
        });

        await tx.internalTransfer.updateMany({
          where: {
            assignedToId: id,
            status: { notIn: ['DONE', 'CANCELED'] }
          },
          data: {
            assignedToId: null
          }
        });
      }

      return updatedStaff;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating staff member', error: error.message });
  }
};

// Toggle staff status
const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active or inactive' });
    }

    const existingStaff = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingStaff || existingStaff.role !== 'STAFF') {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedStaff = await tx.user.update({
        where: { id },
        data: { status }
      });

      // If disabling, unassign pending tasks
      if (status === 'inactive' && existingStaff.status === 'active') {
        await tx.receipt.updateMany({
          where: {
            assignedToId: id,
            status: { notIn: ['DONE', 'CANCELED'] }
          },
          data: {
            assignedToId: null
          }
        });

        await tx.deliveryOrder.updateMany({
          where: {
            assignedToId: id,
            status: { notIn: ['DONE', 'CANCELED'] }
          },
          data: {
            assignedToId: null
          }
        });

        await tx.internalTransfer.updateMany({
          where: {
            assignedToId: id,
            status: { notIn: ['DONE', 'CANCELED'] }
          },
          data: {
            assignedToId: null
          }
        });
      }

      return updatedStaff;
    });

    res.json({ message: `Staff account ${status === 'active' ? 'enabled' : 'disabled'} successfully`, staff: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating staff status', error: error.message });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, autoGenerate } = req.body;

    const existingStaff = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingStaff || existingStaff.role !== 'STAFF') {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    let finalPassword = newPassword;
    if (autoGenerate || !newPassword) {
      finalPassword = generateRandomPassword();
    }

    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date()
      }
    });

    res.json({
      message: autoGenerate || !newPassword 
        ? `Password reset successfully. New password: ${finalPassword}` 
        : 'Password reset successfully',
      password: autoGenerate || !newPassword ? finalPassword : undefined
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

module.exports = {
  getStaffMembers,
  getStaffMemberById,
  createStaffMember,
  updateStaffMember,
  toggleStaffStatus,
  resetPassword
};

