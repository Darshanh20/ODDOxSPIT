const express = require('express');
// Import all functions from the controller
const { registerUser, loginUser, requestOTP, verifyOTP, resetPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;