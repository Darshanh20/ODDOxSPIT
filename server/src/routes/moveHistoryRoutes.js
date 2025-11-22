const express = require('express');
const router = express.Router();
const { getMoveHistory } = require('../controllers/moveHistoryController');
const { 
  createInternalTransfer, 
  validateInternalTransfer 
} = require('../controllers/transferController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Move history routes
router.get('/', getMoveHistory);

// Internal transfer routes (from Move History)
router.post('/internal', createInternalTransfer);
router.post('/internal/:id/validate', (req, res, next) => {
  // Re-route to transfer controller
  const validateTransfer = require('../controllers/transferController').validateInternalTransfer;
  validateTransfer(req, res, next);
});

module.exports = router;

