const express = require('express');
const router = express.Router();
const {
  getStaffMembers,
  getStaffMemberById,
  createStaffMember,
  updateStaffMember,
  toggleStaffStatus,
  resetPassword
} = require('../controllers/staffManagementController');
const { protect, adminOrManager } = require('../middlewares/authMiddleware');

// All routes are protected and admin/manager only
router.use(protect);
router.use(adminOrManager);

// Staff management routes
router.get('/', getStaffMembers);
router.get('/:id', getStaffMemberById);
router.post('/', createStaffMember);
router.put('/:id', updateStaffMember);
router.post('/:id/toggle-status', toggleStaffStatus);
router.post('/:id/reset-password', resetPassword);

module.exports = router;

