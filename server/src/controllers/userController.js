const prisma = require('../utils/prismaClient');

const getUserProfile = (req, res) => {
  // The user object is attached to the request from the 'protect' middleware
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Store the file path in the database
    const imagePath = `/uploads/${req.file.filename}`;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImage: imagePath },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
        profileImage: true,
        createdAt: true
      }
    });

    res.json({ 
      message: 'Profile image uploaded successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, username, phone } = req.body;
    
    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (phone !== undefined) updateData.phone = phone;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
        profileImage: true,
        createdAt: true
      }
    });

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Username already taken' });
    }
    res.status(500).json({ message: 'Error updating profile' });
  }
};

module.exports = { getUserProfile, uploadProfileImage, updateProfile };