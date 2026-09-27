const express = require('express');
const router = express.Router();
const { getPlatformOverview } = require('../controllers/platformOverviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/overview', protect, authorize('admin'), getPlatformOverview);

module.exports = router;
