const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { getOTPVerificationTemplate, getPasswordResetTemplate, getWelcomeTemplate } = require('../utils/emailTemplates');

// ── Token Helper ─────────────────────────────────────────────
// Signs a JWT containing the user's id and role.
// Expiry is controlled by JWT_EXPIRES_IN in .env (default: 30d).
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    });
};

// @desc    Register a student
// @route   POST /api/auth/register-student
// @access  Public
exports.registerStudent = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        let profilePic = 'default-profile.png';

        // If a profile picture was uploaded (via Cloudinary/multer), use its URL
        if (req.file) {
            profilePic = req.file.path;
        }

        // VALIDATION: Prevent duplicate accounts — email must be unique in the User collection
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        console.log(`\n\n=== DEVELOPMENT OTP FOR ${email}: ${otp} ===\n\n`);

        // Create User
        // Create base User record (holds credentials and role)
        const user = await User.create({
            name: `${firstName} ${lastName}`,
            email,
            password,
            role: 'student',
            otp,
            otpExpires,
            isVerified: false
        });

        // Create linked Student profile (holds personal details)
        const student = await Student.create({
            user: user._id,
            firstName,
            lastName,
            profilePic
        });

        // Send OTP Email
        const message = `Your verification OTP is: ${otp}. It is valid for 10 minutes.`;
        try {
            await sendEmail({
                email: user.email,
                subject: 'ExamCoach - Email Verification',
                message,
                html: getOTPVerificationTemplate(otp)
            });
        } catch (error) {
            console.error('Email could not be sent', error);
            // Optionally: user.otp = undefined; user.otpExpires = undefined; await user.save();
            return res.status(500).json({ success: false, error: 'Email could not be sent' });
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please verify your email.',
            userId: user._id
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Verify OTP for user registration
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({ success: false, error: 'Please provide user ID and OTP' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, error: 'User is already verified' });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
        }

        // Mark user as verified
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // After verification, generate token and login the user
        const token = generateToken(user._id, user.role);

        let profile = null;
        if (user.role === 'student') {
            profile = await Student.findOne({ user: user._id });
        }

        // Send Welcome Email asynchronously
        try {
            sendEmail({
                email: user.email,
                subject: 'Welcome to ExamCoach!',
                message: `Welcome to ExamCoach, ${user.name}! Your account is now active.`,
                html: getWelcomeTemplate(user.name.split(' ')[0]) // Pass first name
            });
        } catch (emailErr) {
            console.error('Failed to send welcome email:', emailErr);
            // Don't fail the verification just because the welcome email failed
        }

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profile
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // VALIDATION: Both email and password must be provided
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide an email and password' });
        }

        // VALIDATION: User must exist and password must match the stored bcrypt hash
        // .select('+password') is needed because password is excluded by default in the schema
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            // Need to resend OTP? Optional feature. For now, let's just create a new one to resend
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`\n\n=== DEVELOPMENT RESENT OTP FOR ${user.email}: ${otp} ===\n\n`);
            user.otp = otp;
            user.otpExpires = Date.now() + 10 * 60 * 1000;
            await user.save();

            const message = `Your new verification OTP is: ${otp}. It is valid for 10 minutes.`;
            await sendEmail({
                email: user.email,
                subject: 'ExamCoach - Email Verification',
                message,
                html: getOTPVerificationTemplate(otp)
            });

            return res.status(403).json({
                success: false,
                error: 'Please verify your email first. A new OTP has been sent.',
                requiresVerification: true,
                userId: user._id
            });
        }

        const token = generateToken(user._id, user.role);

        // Fetch role-specific profile data to return alongside the token
        let profile = null;
        if (user.role === 'student') {
            profile = await Student.findOne({ user: user._id });
        } else if (user.role === 'teacher') {
            profile = await Teacher.findOne({ user: user._id });
        }
        // Admin users have no separate profile record

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profile
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Add a teacher (Admin only)
// @route   POST /api/auth/add-teacher
// @access  Private/Admin
exports.addTeacher = async (req, res) => {
    try {
        const {
            name, email, password,
            address, contactNo, nic, experience,
            qualification, subject, gender, dob
        } = req.body;

        let profilePic = 'default-profile.png';
        if (req.file) {
            profilePic = req.file.path;
        }

        // VALIDATION: Teacher email must be unique — same check as student registration
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        // Create base User record with teacher role
        const user = await User.create({
            name,
            email,
            password,
            role: 'teacher',
            isVerified: true // Auto verify teachers added by admin
        });

        // Create linked Teacher profile (holds professional details)
        const teacher = await Teacher.create({
            user: user._id,
            name,
            address,
            contactNo,
            nic,
            experience,
            qualification,
            subject,
            gender,
            dob,
            profilePic
        });

        res.status(201).json({
            success: true,
            message: 'Teacher added successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profile: teacher
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        let profile = null;
        if (user.role === 'student') {
            profile = await Student.findOne({ user: user._id });
        } else if (user.role === 'teacher') {
            profile = await Teacher.findOne({ user: user._id });
        }

        res.status(200).json({
            success: true,
            data: {
                ...user._doc,
                profile
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return res.status(404).json({ success: false, error: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save();

    // Create reset url
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    console.log(`\n\n=== DEVELOPMENT PASSWORD RESET LINK FOR ${user.email} ===`);
    console.log(resetUrl);
    console.log(`=====================================================\n\n`);

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password reset token',
            message,
            html: getPasswordResetTemplate(resetUrl)
        });

        res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
        console.error(err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(500).json({ success: false, error: 'Email could not be sent' });
    }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    }).select('+password'); // select password to be able to hash new one if we had to check old, but we just override. we don't strictly need +password to set a new one, but pre-save might need it

    if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Create token
    const token = generateToken(user._id, user.role);

    let profile = null;
    if (user.role === 'student') {
        profile = await Student.findOne({ user: user._id });
    } else if (user.role === 'teacher') {
        profile = await Teacher.findOne({ user: user._id });
    }

    res.status(200).json({
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile
        }
    });
};
