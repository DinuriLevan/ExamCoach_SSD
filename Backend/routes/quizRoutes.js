const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { protect, authorize } = require('../middleware/authMiddleware');
const { generateQuiz, saveQuizResult, getQuizHistory, getAdminAnalytics, deleteQuizHistory, explainConcept } = require('../controllers/quizController');

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Configure Multer for PDF uploads - temporary storage
const upload = multer({ dest: 'uploads/' });

// @desc    Generate quiz from text/PDFs
// @route   POST /api/quiz/generate
// @access  Private (Student)
router.post('/generate', protect, upload.array('files', 5), generateQuiz);

// @desc    Save completed quiz result
// @route   POST /api/quiz/save
// @access  Private (Student)
router.post('/save', protect, saveQuizResult);

// @desc    Get student's quiz history
// @route   GET /api/quiz/history
// @access  Private (Student)
router.get('/history', protect, getQuizHistory);

// @desc    Delete student's quiz history
// @route   DELETE /api/quiz/history/:id
// @access  Private (Student)
router.delete('/history/:id', protect, deleteQuizHistory);

// @desc    Get Quiz Analytics (Admin)
// @route   GET /api/quiz/admin/stats
// @access  Private (Admin)
router.get('/admin/stats', protect, authorize('admin'), getAdminAnalytics);

// @desc    Explain a concept simply (ELI5)
// @route   POST /api/quiz/explain
// @access  Private (Student)
router.post('/explain', protect, explainConcept);

module.exports = router;
