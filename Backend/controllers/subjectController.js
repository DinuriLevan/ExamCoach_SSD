const Subject = require('../models/Subject');
const Stream = require('../models/Stream');
const Teacher = require('../models/Teacher');
const Lesson = require('../models/Lesson');

// GET /api/subjects
exports.getSubjects = async (req, res) => {
    try {
        const query = {};
        if (req.query.stream) query.stream = req.query.stream;
        if (req.query.teacher) query.teacher = req.query.teacher;

        const subjects = await Subject.find(query)
            .populate('stream', 'name')
            .populate({ path: 'teacher', select: 'name user', populate: { path: 'user', select: 'email' } })
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: subjects });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/subjects/:id
exports.getSubject = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id)
            .populate('stream', 'name')
            .populate({ path: 'teacher', select: 'name user', populate: { path: 'user', select: 'email' } });

        if (!subject) {
            return res.status(404).json({ success: false, error: 'Subject not found' });
        }

        res.status(200).json({ success: true, data: subject });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/subjects (admin)
exports.createSubject = async (req, res) => {
    try {
        const { name, stream, teacher, description } = req.body;

        const streamDoc = await Stream.findById(stream);
        if (!streamDoc) return res.status(400).json({ success: false, error: 'Invalid stream' });

        const teacherDoc = await Teacher.findById(teacher);
        if (!teacherDoc) return res.status(400).json({ success: false, error: 'Invalid teacher' });

        const subject = await Subject.create({ name, stream, teacher, description });
        const populated = await Subject.findById(subject._id)
            .populate('stream', 'name')
            .populate({ path: 'teacher', select: 'name user', populate: { path: 'user', select: 'email' } });

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, error: 'Subject with this name already exists in the selected stream' });
        }
        res.status(400).json({ success: false, error: err.message });
    }
};

// PUT /api/subjects/:id (admin)
exports.updateSubject = async (req, res) => {
    try {
        const updates = { ...req.body };

        if (updates.stream) {
            const streamExists = await Stream.exists({ _id: updates.stream });
            if (!streamExists) return res.status(400).json({ success: false, error: 'Invalid stream' });
        }

        if (updates.teacher) {
            const teacherExists = await Teacher.exists({ _id: updates.teacher });
            if (!teacherExists) return res.status(400).json({ success: false, error: 'Invalid teacher' });
        }

        const subject = await Subject.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
            .populate('stream', 'name')
            .populate({ path: 'teacher', select: 'name user', populate: { path: 'user', select: 'email' } });

        if (!subject) return res.status(404).json({ success: false, error: 'Subject not found' });

        res.status(200).json({ success: true, data: subject });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, error: 'Subject with this name already exists in the selected stream' });
        }
        res.status(400).json({ success: false, error: err.message });
    }
};

// DELETE /api/subjects/:id (admin)
exports.deleteSubject = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ success: false, error: 'Subject not found' });

        await Lesson.deleteMany({ subject: subject._id });
        await subject.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
