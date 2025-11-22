const express = require('express');
const {
  googleCallback,
  verifyResetToken,
  resetPasswordViaGoogle,
  sendPasswordResetEmail
} = require('../controllers/googleAuthController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Google OAuth callback - exchange auth code for tokens
router.post('/google/callback', googleCallback);

// Send password reset email (initiates forgot password flow)
router.post('/forgot-password/email', sendPasswordResetEmail);

// Verify reset token (called by frontend before allowing password reset)
router.post('/verify-reset-token', protect, verifyResetToken);

// Reset password via Google OAuth verification
router.post('/reset-password-google', protect, resetPasswordViaGoogle);

module.exports = router;
