const express = require('express');
const {
    getKuppis,
    getKuppi,
    uploadKuppi,
    updateKuppi,
    deleteKuppi
} = require('../controllers/kuppiController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateKuppiUpload } = require('../middleware/validationMiddleware');
const { uploadVideo, uploadThumbnail } = require('../config/cloudinary');

const router = express.Router();

// Temporarily disable authentication for testing
// router.use(protect);

// Public routes for students and teachers
router.route('/')
    .get(getKuppis);

// Teacher only routes
router.route('/')
    .post(
        uploadVideo.fields([
            { name: 'video', maxCount: 1 },
            { name: 'thumbnail', maxCount: 1 }
        ]),
        validateKuppiUpload, 
        uploadKuppi
    );

router.route('/:id')
    .get(getKuppi)
    .put(authorize('teacher'), updateKuppi)
    .delete(authorize('teacher', 'admin'), deleteKuppi);

module.exports = router;