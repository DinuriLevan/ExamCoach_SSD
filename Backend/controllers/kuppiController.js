const Kuppi = require('../models/Kuppi');
const Teacher = require('../models/Teacher');

// @desc    Get all kuppi sessions
// @route   GET /api/kuppi
// @access  Private (Students and Teachers)
exports.getKuppis = async (req, res) => {
    try {
        const kuppis = await Kuppi.find({ isActive: true })
            .populate('uploadedBy', 'name subject')
            .sort({ createdAt: -1 });
        
        res.status(200).json({ 
            success: true, 
            count: kuppis.length, 
            data: kuppis 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get single kuppi session
// @route   GET /api/kuppi/:id
// @access  Private
exports.getKuppi = async (req, res) => {
    try {
        const kuppi = await Kuppi.findById(req.params.id)
            .populate('uploadedBy', 'name subject');

        if (!kuppi) {
            return res.status(404).json({ 
                success: false, 
                error: 'Kuppi session not found' 
            });
        }

        // Increment view count
        kuppi.views += 1;
        await kuppi.save();

        res.status(200).json({ success: true, data: kuppi });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Upload kuppi session
// @route   POST /api/kuppi
// @access  Private/Teacher
exports.uploadKuppi = async (req, res) => {
    try {
        console.log('Upload kuppi request received');
        console.log('Request body:', req.body);
        console.log('Request files:', req.files);

        // Temporarily disable teacher check for testing
        // const teacher = await Teacher.findOne({ user: req.user.id });

        // if (!teacher) {
        //     return res.status(404).json({
        //         success: false,
        //         error: 'Teacher profile not found'
        //     });
        // }

        // Extract file URLs from uploaded files
        const videoUrl = req.files && req.files.video ? req.files.video[0].path : req.body.videoUrl;
        const thumbnailUrl = req.files && req.files.thumbnail ? req.files.thumbnail[0].path : req.body.thumbnailUrl;

        console.log('Video URL:', videoUrl);
        console.log('Thumbnail URL:', thumbnailUrl);

        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                error: 'Video file is required'
            });
        }

        const kuppiData = {
            title: req.body.title,
            description: req.body.description,
            subject: req.body.subject,
            videoUrl: videoUrl,
            thumbnailUrl: thumbnailUrl,
            duration: req.body.duration,
            uploadedBy: null // Temporarily set to null for testing
        };

        console.log('Creating kuppi with data:', kuppiData);

        const kuppi = await Kuppi.create(kuppiData);

        console.log('Kuppi created successfully:', kuppi);

        res.status(201).json({ success: true, data: kuppi });
    } catch (err) {
        console.error('Error in uploadKuppi:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Update kuppi session
// @route   PUT /api/kuppi/:id
// @access  Private/Teacher (own kuppi only)
exports.updateKuppi = async (req, res) => {
    try {
        let kuppi = await Kuppi.findById(req.params.id);

        if (!kuppi) {
            return res.status(404).json({ 
                success: false, 
                error: 'Kuppi session not found' 
            });
        }

        // Temporarily handle unauthenticated requests for testing
        if (req.user && req.user.id) {
            // Check if teacher owns this kuppi
            const teacher = await Teacher.findOne({ user: req.user.id });
            if (kuppi.uploadedBy.toString() !== teacher._id.toString()) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Not authorized to update this kuppi' 
                });
            }
        }
        // For testing without auth, allow updates

        kuppi = await Kuppi.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: kuppi });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Delete kuppi session
// @route   DELETE /api/kuppi/:id
// @access  Private/Teacher (own kuppi only) or Admin
exports.deleteKuppi = async (req, res) => {
    try {
        const kuppi = await Kuppi.findById(req.params.id);

        if (!kuppi) {
            return res.status(404).json({ 
                success: false, 
                error: 'Kuppi session not found' 
            });
        }

        // Temporarily handle unauthenticated requests for testing
        if (req.user && req.user.id) {
            // Check if teacher owns this kuppi or is admin
            const teacher = await Teacher.findOne({ user: req.user.id });
            if (req.user.role !== 'admin' && 
                kuppi.uploadedBy.toString() !== teacher._id.toString()) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Not authorized to delete this kuppi' 
                });
            }
        }
        // For testing without auth, allow deletion

        await kuppi.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Submit kuppi session
// @route   POST /api/kuppi/submit
// @access  Private
exports.submitKuppi = async (req, res) => {
    try {
        const token = req.user.token;
        const submitData = req.files ? req.files : req.body;

        const response = await fetch('/api/kuppi', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: submitData  // FormData with files
        });

        res.status(200).json({ success: true, data: response });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};