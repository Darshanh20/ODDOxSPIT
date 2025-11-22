const express = require('express');
const multer = require('multer');
const path = require('path');
const { getUserProfile, uploadProfileImage, updateProfile } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware'); // Import the middleware

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Apply the 'protect' middleware to this route
router.get('/me', protect, getUserProfile);
router.get('/:id', protect, getUserProfile);
router.post('/upload-image', protect, upload.single('profileImage'), uploadProfileImage);
router.put('/update-profile', protect, updateProfile);

module.exports = router;