const express = require('express');
const { deleteLesson, updateLesson } = require('../controllers/lessonController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { materialUpload } = require('../config/cloudinary');

const router = express.Router();

router.route('/:id')
    .put(protect, authorize('teacher', 'admin'), materialUpload.array('materials', 5), updateLesson)
    .delete(protect, authorize('teacher', 'admin'), deleteLesson);

module.exports = router;
