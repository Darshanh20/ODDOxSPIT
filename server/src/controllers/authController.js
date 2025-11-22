const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // Validate username format (SMYYYY#### - 6-12 characters)
    const usernamePattern = /^SM\d{4}\d+$/;
    if (!usernamePattern.test(username) || username.length < 6 || username.length > 12) {
      return res.status(400).json({ message: 'Invalid username format. Use SMYYYY#### (6-12 characters)' });
    }

    // Validate password requirements (8+ chars, uppercase, lowercase, number, special char)
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
    if (password.length < 8 || !passwordPattern.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ message: 'Login ID already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'STAFF', // Default role
      },
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Failed to create user' });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login existing user
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Login ID and password are required' });
    }

    // Find user by username
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid Login ID or password' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Login ID or password' });
    }

    res.json({
      _id: user.id,
      username: user.username,
      email: user.email,
      token: generateToken(user.id),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

module.exports = { registerUser, loginUser };