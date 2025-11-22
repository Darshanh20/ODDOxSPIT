const express = require('express');
const router = express.Router();
const {
  getDashboardKPIs,
  getStockOverview,
  getDocumentStatistics,
  getTopProducts,
  getAlerts
} = require('../controllers/dashboardController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

// Admin-only dashboard routes
router.get('/kpis', adminOnly, getDashboardKPIs);
router.get('/stock-overview', adminOnly, getStockOverview);
router.get('/document-stats', adminOnly, getDocumentStatistics);
router.get('/top-products', adminOnly, getTopProducts);
router.get('/alerts', adminOnly, getAlerts);

module.exports = router;
