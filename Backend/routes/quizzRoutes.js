const express = require('express');
const {
    getQuizzes,
    getQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    submitQuizAttempt,
    getStudentAttempts,
    verifyQuizAccess,
    getQuizAttempts,
    getMyAttemptsForQuiz,
    enrollToQuiz          // look up quiz by enrollment key
} = require('../controllers/quizzController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateQuizCreation } = require('../middleware/validationMiddleware');

const router = express.Router();

// Public quiz listing / create
router.route('/')
    .get(getQuizzes)
    .post(validateQuizCreation, createQuiz);

// Student enroll by key — must be before /:id routes
// POST /api/quizzes/enroll  { enrollmentKey, quizPassword }
router.route('/enroll')
    .post(protect, enrollToQuiz);

// Student attempts (must be before /:id routes)
router.route('/attempts')
    .get(protect, getStudentAttempts);

router.route('/:id')
    .get(getQuiz)
    .put(updateQuiz)
    .delete(deleteQuiz);

router.route('/:id/verify')
    .post(protect, verifyQuizAccess);

router.route('/:id/attempt')
    .post(protect, submitQuizAttempt);

router.route('/:id/attempts')
    .get(getQuizAttempts);

router.route('/:id/my-attempts')
    .get(protect, getMyAttemptsForQuiz);

module.exports = router;