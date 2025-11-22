const express = require('express');
const router = express.Router();
const {
  getReceipts,
  getReceiptById,
  createReceipt,
  updateReceipt,
  validateReceipt,
  cancelReceipt,
  acceptReceipt
} = require('../controllers/receiptController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Receipt routes
router.get('/', getReceipts);
router.get('/:id', getReceiptById);
router.post('/', createReceipt);
router.put('/:id', updateReceipt);
router.post('/:id/validate', validateReceipt);
router.post('/:id/cancel', cancelReceipt);
router.post('/:id/accept', acceptReceipt);

module.exports = router;
