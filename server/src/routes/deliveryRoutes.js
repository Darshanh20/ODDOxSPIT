const express = require('express');
const router = express.Router();
const {
  getDeliveryOrders,
  getDeliveryOrderById,
  createDeliveryOrder,
  updateDeliveryOrder,
  pickDeliveryItems,
  packDeliveryItems,
  validateDelivery,
  cancelDelivery,
  acceptDelivery
} = require('../controllers/deliveryController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Delivery order routes
router.get('/', getDeliveryOrders);
router.get('/:id', getDeliveryOrderById);
router.post('/', createDeliveryOrder);
router.put('/:id', updateDeliveryOrder);
router.post('/:id/pick', pickDeliveryItems);
router.post('/:id/pack', packDeliveryItems);
router.post('/:id/validate', validateDelivery);
router.post('/:id/cancel', cancelDelivery);
router.post('/:id/accept', acceptDelivery);

module.exports = router;
