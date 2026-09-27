const Stream = require('../models/Stream');

// GET /api/streams
exports.getStreams = async (_req, res) => {
    try {
        const streams = await Stream.find().sort('name');
        res.status(200).json({ success: true, data: streams });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/streams (admin)
exports.createStream = async (req, res) => {
    try {
        const stream = await Stream.create(req.body);
        res.status(201).json({ success: true, data: stream });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
