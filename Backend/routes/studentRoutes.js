const express = require('express');
const { getAllStudents, getStudent, deleteStudent, getStudentProfile, updateStudentProfile, changePassword } = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Profile routes - students can access their own profile
router.route('/profile/:userId')
    .get(protect, getStudentProfile)
    .put(protect, updateStudentProfile);

// Password change route - students can change their own password
router.route('/change-password/:userId')
    .put(protect, changePassword);

// Admin-only routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
    .get(getAllStudents);

router.route('/:id')
    .get(getStudent)
    .delete(deleteStudent);

module.exports = router;
