const Teacher = require('../models/Teacher');
const User = require('../models/User');

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Private/Admin
exports.getTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find().populate('user', 'name email');
        res.status(200).json({ success: true, count: teachers.length, data: teachers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Private/Admin
exports.getTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id).populate('user', 'name email');

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }

        res.status(200).json({ success: true, data: teacher });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get teacher profile by user ID
// @route   GET /api/teachers/profile/:userId
// @access  Private (Teacher themselves)
exports.getTeacherProfile = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ user: req.params.userId }).populate('user', 'name email');

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        }

        res.status(200).json({
            success: true,
            data: teacher
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Update teacher profile
// @route   PUT /api/teachers/profile/:userId
// @access  Private (Teacher themselves)
exports.updateTeacherProfile = async (req, res) => {
    try {
        const { name, subject, qualification, experience, phone, bio, profilePic } = req.body;

        // Find teacher by user ID
        const teacher = await Teacher.findOne({ user: req.params.userId });

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        }

        // Update User name if provided
        if (name) {
            await User.findByIdAndUpdate(req.params.userId, { name });
        }

        // Update Teacher fields
        if (subject) teacher.subject = subject;
        if (qualification) teacher.qualification = qualification;
        if (experience !== undefined) teacher.experience = experience;
        if (phone) teacher.phone = phone;
        if (bio) teacher.bio = bio;
        if (profilePic) teacher.profilePic = profilePic;

        await teacher.save();

        const updatedTeacher = await Teacher.findById(teacher._id).populate('user', 'name email');

        res.status(200).json({
            success: true,
            data: updatedTeacher
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private/Admin
exports.updateTeacher = async (req, res) => {
    try {
        let teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }

        // Update teacher profile fields
        teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        // If name or email is updated, update User model as well (optional, but good practice)
        if (req.body.name || req.body.email) {
            const updateFields = {};
            if (req.body.name) updateFields.name = req.body.name;
            if (req.body.email) updateFields.email = req.body.email;

            await User.findByIdAndUpdate(teacher.user, updateFields);
        }

        res.status(200).json({ success: true, data: teacher });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private/Admin
exports.deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }

        // Delete associated User account
        await User.findByIdAndDelete(teacher.user);

        // Delete Teacher profile
        await teacher.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Upload Kuppi
// @route   POST /api/teachers/upload-kuppi
// @access  Private/Admin
exports.uploadKuppi = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }

        const result = await teacher.uploadKuppi(req.file);

        res.status(200).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Create Quiz
// @route   POST /api/teachers/create-quiz
// @access  Private/Admin
exports.createQuiz = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }

        const result = await teacher.createQuiz(req.body);

        res.status(200).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
