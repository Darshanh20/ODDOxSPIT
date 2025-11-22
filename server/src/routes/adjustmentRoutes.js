const express = require('express');
const router = express.Router();
const {
  getStockAdjustments,
  getStockAdjustmentById,
  createStockAdjustment,
  updateStockAdjustment,
  validateStockAdjustment,
  cancelStockAdjustment,
  getStockLedger
} = require('../controllers/adjustmentController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Stock adjustment routes
router.get('/', getStockAdjustments);
router.get('/:id', getStockAdjustmentById);
router.post('/', createStockAdjustment);
router.put('/:id', updateStockAdjustment);
router.post('/:id/validate', validateStockAdjustment);
router.post('/:id/cancel', cancelStockAdjustment);

// Stock ledger (move history) routes
router.get('/ledger/history', getStockLedger);

module.exports = router;
