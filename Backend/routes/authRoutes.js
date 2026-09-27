const express = require('express');
const { registerStudent, login, addTeacher, getMe, verifyOTP, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { profileUpload } = require('../config/cloudinary');

const router = express.Router();

router.post('/register-student', profileUpload.single('profilePic'), registerStudent);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.post('/add-teacher', protect, authorize('admin'), profileUpload.single('profilePic'), addTeacher);
router.get('/me', protect, getMe);

module.exports = router;
