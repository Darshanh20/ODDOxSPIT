const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');

// Helper function to check if input is email
const isEmail = (input) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(input);
};

// Helper function to validate phone
const validatePhone = (phone) => {
  const phonePattern = /^[\d\s\-\+\(\)]{10,}$/;
  return phonePattern.test(phone.replace(/\s/g, ''));
};

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // At least email or phone must be provided
    if (!email && !phone) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    // Validate email if provided
    if (email && !isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
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
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already registered' });
      }
    }

    // Check if phone already exists (if phone is provided)
    if (phone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone } });
      if (existingPhone) {
        return res.status(409).json({ message: 'Phone number already registered' });
      }
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
    const userData = {
      username,
      password: hashedPassword,
      role: 'STAFF', // Default role
    };

    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    const user = await prisma.user.create({
      data: userData,
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

    // Validate Login ID length
    if (username.trim().length < 6 || username.trim().length > 12) {
      return res.status(400).json({ message: 'Invalid Login ID format' });
    }

    // Find user by username (Login ID)
    const user = await prisma.user.findUnique({ where: { username: username.trim() } });

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid Login ID or Password' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Login ID or Password' });
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

// Request OTP for password reset
const requestOTP = async (req, res) => {
  try {
    const { emailOrPhone } = req.body;

    if (!emailOrPhone) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    // Find user by email, phone, or username
    let user = null;
    if (isEmail(emailOrPhone)) {
      user = await prisma.user.findUnique({ where: { email: emailOrPhone } });
    } else if (validatePhone(emailOrPhone)) {
      user = await prisma.user.findFirst({ where: { phone: emailOrPhone.replace(/\s/g, '') } });
    } else {
      // Fallback to username if not email/phone
      user = await prisma.user.findUnique({ where: { username: emailOrPhone } });
    }

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({ message: 'If an account exists, an OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpires,
      },
    });

    // TODO: In production, send OTP via email/SMS service
    // For now, we'll log it (remove in production)
    console.log(`OTP for ${emailOrPhone}: ${otp}`);

    res.status(200).json({
      message: 'OTP sent successfully',
      // Remove this in production - only for development
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (err) {
    console.error('Request OTP error:', err);
    res.status(500).json({ message: 'Server error during OTP request' });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { emailOrPhone, otp } = req.body;

    if (!emailOrPhone || !otp) {
      return res.status(400).json({ message: 'Email/phone and OTP are required' });
    }

    // Find user by email, phone, or username
    let user = null;
    if (isEmail(emailOrPhone)) {
      user = await prisma.user.findUnique({ where: { email: emailOrPhone } });
    } else if (validatePhone(emailOrPhone)) {
      user = await prisma.user.findFirst({ where: { phone: emailOrPhone.replace(/\s/g, '') } });
    } else {
      // Fallback to username if not email/phone
      user = await prisma.user.findUnique({ where: { username: emailOrPhone } });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otpExpires) {
      return res.status(401).json({ message: 'OTP not found. Please request a new one.' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(401).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    // Generate reset token (valid for 15 minutes)
    const resetToken = generateToken(user.id);

    res.json({
      message: 'OTP verified successfully',
      resetToken,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { emailOrPhone, password, resetToken } = req.body;

    if (!emailOrPhone || !password || !resetToken) {
      return res.status(400).json({ message: 'Email/phone, password, and reset token are required' });
    }

    // Verify reset token
    let decoded;
    try {
      const jwt = require('jsonwebtoken');
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired reset token' });
    }

    // Find user by email, phone, or username
    let user = null;
    if (isEmail(emailOrPhone)) {
      user = await prisma.user.findUnique({ where: { email: emailOrPhone } });
    } else if (validatePhone(emailOrPhone)) {
      user = await prisma.user.findFirst({ where: { phone: emailOrPhone.replace(/\s/g, '') } });
    } else {
      // Fallback to username if not email/phone
      user = await prisma.user.findUnique({ where: { username: emailOrPhone } });
    }

    if (!user || user.id !== decoded.id) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify OTP was used (optional additional check)
    if (!user.otp) {
      return res.status(401).json({ message: 'OTP verification required. Please verify OTP first.' });
    }

    // Validate password requirements
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
    if (password.length < 8 || !passwordPattern.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpires: null,
      },
    });

    res.json({
      message: 'Password reset successfully',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

module.exports = { registerUser, loginUser, requestOTP, verifyOTP, resetPassword };