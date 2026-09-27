const express = require('express');
const { getAllStudents, getStudent, deleteStudent, getStudentProfile, updateStudentProfile, changePassword } = require('../controllers/studentController');
const { protect, authorize, requireSelfOrAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// FIX (SECURITY_AUDIT.md Finding 3 — A01 Broken Access Control / IDOR): these routes used to
// only check `protect` (i.e. "is this a valid token from ANY student"), not that the token
// belongs to the same student as :userId. Any logged-in student could read/edit another
// student's profile, or change another student's password, by swapping the id in the URL.
// `requireSelfOrAdmin('userId')` now enforces req.user.id === :userId (or admin) on every one
// of these routes.

// Profile routes - students can access their own profile
router.route('/profile/:userId')
    .get(protect, requireSelfOrAdmin('userId'), getStudentProfile)
    .put(protect, requireSelfOrAdmin('userId'), updateStudentProfile);

// Password change route - students can change their own password
router.route('/change-password/:userId')
    .put(protect, requireSelfOrAdmin('userId'), changePassword);

// Admin-only routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
    .get(getAllStudents);

router.route('/:id')
    .get(getStudent)
    .delete(deleteStudent);

module.exports = router;
