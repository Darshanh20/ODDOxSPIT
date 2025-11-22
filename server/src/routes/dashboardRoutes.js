const express = require('express');
const router = express.Router();
const {
  getDashboardKPIs,
  getStockOverview,
  getDocumentStatistics,
  getTopProducts,
  getAlerts
} = require('../controllers/dashboardController');
const { protect } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Dashboard routes
router.get('/kpis', getDashboardKPIs);
router.get('/stock-overview', getStockOverview);
router.get('/document-stats', getDocumentStatistics);
router.get('/top-products', getTopProducts);
router.get('/alerts', getAlerts);

module.exports = router;
