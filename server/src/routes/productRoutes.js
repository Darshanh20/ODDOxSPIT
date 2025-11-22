const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getStockByWarehouse,
  getStockByLocation,
  getNextSKU
} = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Product routes
router.get('/', getProducts);
router.get('/low-stock', getLowStockProducts);
router.get('/next-sku', getNextSKU);
router.get('/:id/stock/warehouse', getStockByWarehouse);
router.get('/:id/stock/location', getStockByLocation);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
