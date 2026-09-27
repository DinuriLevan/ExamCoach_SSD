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

// Public quiz listing (credentials/answers are stripped in the controller).
// FIX (SECURITY_AUDIT.md Finding 1 — A01 Broken Access Control): quiz creation was reachable
// with no authentication at all. Now requires a logged-in teacher.
router.route('/')
    .get(getQuizzes)
    .post(protect, authorize('teacher'), validateQuizCreation, createQuiz);

// Student enroll by key — must be before /:id routes
// POST /api/quizzes/enroll  { enrollmentKey, quizPassword }
router.route('/enroll')
    .post(protect, enrollToQuiz);

// Student attempts (must be before /:id routes)
router.route('/attempts')
    .get(protect, getStudentAttempts);

// FIX (SECURITY_AUDIT.md Finding 1 — A01 Broken Access Control): PUT/DELETE had NO auth
// middleware at all, so anyone could edit or delete any quiz. GET now also requires login
// so the controller can tell a quiz owner apart from a regular student (see Finding 2 fix in
// quizzController.getQuiz, which uses req.user to decide whether to include the answer key).
router.route('/:id')
    .get(protect, getQuiz)
    .put(protect, authorize('teacher'), updateQuiz)
    .delete(protect, authorize('teacher', 'admin'), deleteQuiz);

router.route('/:id/verify')
    .post(protect, verifyQuizAccess);

router.route('/:id/attempt')
    .post(protect, submitQuizAttempt);

// FIX (SECURITY_AUDIT.md Finding 1 — A01 Broken Access Control): this teacher-only results
// view was public. Now requires a logged-in teacher/admin (ownership is further checked
// inside the controller so a teacher can only see their own quiz's results).
router.route('/:id/attempts')
    .get(protect, authorize('teacher', 'admin'), getQuizAttempts);

router.route('/:id/my-attempts')
    .get(protect, getMyAttemptsForQuiz);

module.exports = router;