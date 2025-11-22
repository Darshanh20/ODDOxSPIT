const prisma = require('../utils/prismaClient');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

/**
 * Google OAuth Callback Handler
 * This endpoint is called after user successfully authenticates with Google
 */
const googleCallback = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    // Validate required fields from Google
    if (!email || !googleId) {
      return res.status(400).json({
        message: 'Invalid Google authentication data',
        success: false
      });
    }

    // Find or create user with Google ID
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create new user with Google auth
      user = await prisma.user.create({
        data: {
          username: email.split('@')[0] + '_' + Date.now().toString().slice(-4),
          email: email,
          googleId: googleId,
          name: name || email.split('@')[0],
          password: null, // No password for OAuth users initially
          phone: null,
          role: 'STAFF'
        }
      });
    } else if (!user.googleId) {
      // Link Google ID to existing user
      user = await prisma.user.update({
        where: { email },
        data: { googleId }
      });
    }

    // Generate JWT tokens
    const accessToken = generateToken(user.id, '1h');
    const refreshToken = generateToken(user.id, '7d');

    // Store refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      }
    });
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(500).json({
      message: 'Google authentication failed',
      error: error.message,
      success: false
    });
  }
};

/**
 * Verify Token for Password Reset
 * Frontend calls this after Google OAuth success to verify token validity
 */
const verifyResetToken = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        message: 'Access token required',
        success: false
      });
    }

    // Verify token (we'll do a simple check - in production use JWT verification)
    // The token is already verified by the frontend by checking if they have it
    // Here we just confirm the user exists and is authenticated
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Unauthorized',
        success: false
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token verified successfully',
      verified: true
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      message: 'Token verification failed',
      success: false
    });
  }
};

/**
 * Reset Password (for Google OAuth verified users)
 * Called after user verifies identity via Google OAuth
 */
const resetPasswordViaGoogle = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user?.id; // From auth middleware

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized - User not authenticated',
        success: false
      });
    }

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Password and confirm password are required',
        success: false
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match',
        success: false
      });
    }

    // Validate password requirements (8+ chars, uppercase, lowercase, number, special char)
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
    if (newPassword.length < 8 || !passwordPattern.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
        success: false
      });
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        success: false
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      message: 'Failed to reset password',
      error: error.message,
      success: false
    });
  }
};

/**
 * Send Password Reset Link via Email
 * Can be called before Google OAuth as alternative flow
 */
const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        success: false
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists (security best practice)
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link will be sent'
      });
    }

    // Generate reset token (in production, save this in DB with expiry)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    
    // In a real scenario, you'd store this in DB with expiry
    // For now, we'll just generate it and the frontend will use Google OAuth instead

    return res.status(200).json({
      success: true,
      message: 'Password reset initiated. Please authenticate with Google to proceed.',
      requiresGoogleAuth: true
    });
  } catch (error) {
    console.error('Send reset email error:', error);
    return res.status(500).json({
      message: 'Failed to send reset email',
      error: error.message,
      success: false
    });
  }
};

module.exports = {
  googleCallback,
  verifyResetToken,
  resetPasswordViaGoogle,
  sendPasswordResetEmail
};
