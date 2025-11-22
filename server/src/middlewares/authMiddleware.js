const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token and attach it to the request object
      // Exclude the password from the user object
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { 
          id: true, 
          email: true, 
          name: true, 
          username: true, 
          firstName: true, 
          lastName: true, 
          phone: true, 
          profileImage: true, 
          role: true,
          createdAt: true 
        },
      });

      next(); // Move on to the next function
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to check if user is admin
const adminOnly = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }

  next();
};

// Middleware to check if user is admin or manager
const adminOrManager = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user' });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ message: 'Access denied. Admin or Manager only.' });
  }

  next();
};

module.exports = { protect, adminOnly, adminOrManager };