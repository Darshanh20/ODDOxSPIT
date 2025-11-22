const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getLocationsByWarehouse,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/warehouseController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Warehouse routes
router.get('/warehouses', getWarehouses);
router.get('/warehouses/:id', getWarehouseById);
router.post('/warehouses', createWarehouse);
router.put('/warehouses/:id', updateWarehouse);
router.delete('/warehouses/:id', deleteWarehouse);

// Location routes
router.get('/warehouses/:warehouseId/locations', getLocationsByWarehouse);
router.get('/locations/:id', getLocationById);
router.post('/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

// Category routes
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

module.exports = router;
