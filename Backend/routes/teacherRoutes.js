const express = require('express');
const {
    getTeachers,
    getTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacherProfile,
    updateTeacherProfile
} = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Profile routes - teachers can access their own profile
router.route('/profile/:userId')
    .get(protect, getTeacherProfile)
    .put(protect, updateTeacherProfile);

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
