const express = require('express');
// Import both functions from the controller
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser); // <-- Add this line

module.exports = router;