const express = require('express');
const {
    getTeachers,
    getTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacherProfile,
    updateTeacherProfile
} = require('../controllers/teacherController');
const { protect, authorize, requireSelfOrAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// FIX (SECURITY_AUDIT.md Finding 3 — A01 Broken Access Control / IDOR): same issue as
// studentRoutes.js — `protect` alone didn't verify the token belonged to the same teacher
// as :userId, so any logged-in teacher could read/edit another teacher's profile.
// `requireSelfOrAdmin('userId')` now enforces req.user.id === :userId (or admin).

// Profile routes - teachers can access their own profile
router.route('/profile/:userId')
    .get(protect, requireSelfOrAdmin('userId'), getTeacherProfile)
    .put(protect, requireSelfOrAdmin('userId'), updateTeacherProfile);

// All other routes are protected and restricted to Admin
router.use(protect);
router.use(authorize('admin'));

router.route('/')
    .get(getTeachers);

router.route('/:id')
    .get(getTeacher)
    .put(updateTeacher)
    .delete(deleteTeacher);

module.exports = router;
