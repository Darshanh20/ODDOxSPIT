const express = require('express');
const router = express.Router();
const {
  getInternalTransfers,
  getInternalTransferById,
  createInternalTransfer,
  updateInternalTransfer,
  validateInternalTransfer,
  cancelInternalTransfer,
  acceptTransfer
} = require('../controllers/transferController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Internal transfer routes
router.get('/', getInternalTransfers);
router.get('/:id', getInternalTransferById);
router.post('/', createInternalTransfer);
router.put('/:id', updateInternalTransfer);
router.post('/:id/validate', validateInternalTransfer);
router.post('/:id/cancel', cancelInternalTransfer);
router.post('/:id/accept', acceptTransfer);

module.exports = router;
