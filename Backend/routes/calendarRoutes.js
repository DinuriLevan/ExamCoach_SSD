const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    initiateAuth,
    handleCallback,
    disconnectCalendar,
    getConnectionStatus,
    syncStudyPlan
} = require('../controllers/calendarController');

// @route   GET /api/calendar/auth
router.get('/auth', protect, initiateAuth);

// @route   GET /api/calendar/callback
router.get('/callback', handleCallback);

// @route   GET /api/calendar/status
router.get('/status', protect, getConnectionStatus);

// @route   POST /api/calendar/disconnect
router.post('/disconnect', protect, disconnectCalendar);

// @route   POST /api/calendar/sync/:studyPlanId
router.post('/sync/:studyPlanId', protect, syncStudyPlan);

module.exports = router;
