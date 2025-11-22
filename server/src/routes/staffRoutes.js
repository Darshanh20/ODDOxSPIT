const express = require('express');
const router = express.Router();
const {
  getStaffStats,
  getPendingTasks,
  getActiveTasks
} = require('../controllers/staffController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Staff routes
router.get('/stats', getStaffStats);
router.get('/tasks/pending', getPendingTasks);
router.get('/tasks/active', getActiveTasks);

module.exports = router;

