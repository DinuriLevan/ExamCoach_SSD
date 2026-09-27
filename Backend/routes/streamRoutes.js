const express = require('express');
const { getStreams, createStream } = require('../controllers/streamController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(getStreams)
    .post(protect, authorize('admin'), createStream);

module.exports = router;
