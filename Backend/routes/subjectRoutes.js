const express = require('express');
const { getSubjects, getSubject, createSubject, updateSubject, deleteSubject } = require('../controllers/subjectController');
const { getLessonsForSubject, createLesson } = require('../controllers/lessonController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { materialUpload } = require('../config/cloudinary');

const router = express.Router();

router.route('/')
	.get(getSubjects)
	.post(protect, authorize('admin'), createSubject);

router.route('/:id')
	.get(getSubject)
	.put(protect, authorize('admin'), updateSubject)
	.delete(protect, authorize('admin'), deleteSubject);

router.route('/:subjectId/lessons')
	.get(getLessonsForSubject)
	.post(protect, authorize('teacher', 'admin'), materialUpload.array('materials', 5), createLesson);

module.exports = router;
