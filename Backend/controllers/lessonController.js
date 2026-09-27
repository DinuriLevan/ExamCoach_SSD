const Lesson = require('../models/Lesson');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const cloudinary = require('cloudinary').v2;
require('../config/cloudinary');

// Safely parse link array from multipart/form-data
const parseMaterialLinks = (value) => {
    if (!value) return [];
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) return [];
        return parsed.map((link) => String(link).trim()).filter(Boolean);
    } catch (err) {
        return [];
    }
};

const mapLinksToMaterials = (links = []) => links.map((link) => ({
    url: link,
    publicId: null,
    format: link.split('.').pop()?.toLowerCase() || 'link',
    resourceType: 'link',
    originalName: link,
    size: null,
    isLink: true
}));

const detectResourceType = ({ resourceType, format, originalName }) => {
    if (resourceType && ['image', 'video', 'raw'].includes(resourceType)) {
        return resourceType;
    }
    const ext = (format || originalName || '').toLowerCase().split('.').pop();
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
    // default documents to raw
    if (['pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(ext)) return 'raw';
    return 'raw';
};

const buildCloudinaryUrl = ({ publicId, url, resourceType, format }) => {
    const safeFormat = (format || '').replace('.', '') || undefined;
    if (publicId) {
        // If raw file already has extension in publicId, don't double it
        let fmt = safeFormat;
        if (resourceType === 'raw' && safeFormat && publicId.toLowerCase().endsWith(`.${safeFormat}`)) {
            fmt = undefined;
        }

        // Always rebuild using publicId to avoid stale/broken stored URLs
        return cloudinary.url(publicId, {
            resource_type: resourceType || 'raw',
            format: fmt,
            secure: true
        });
    }
    // fallback to stored url if no publicId (e.g., link entries)
    return url;
};

const inferFormat = (materialObj) => {
    if (materialObj.format) return materialObj.format;
    const fromName = (materialObj.originalName || '').split('.').pop();
    if (fromName) return fromName.toLowerCase();
    const fromUrl = (materialObj.url || '').split('?')[0].split('.').pop();
    return fromUrl ? fromUrl.toLowerCase() : '';
};

const normalizeMaterials = (materials = []) => materials.map((m) => {
    const materialObj = m.toObject ? m.toObject() : m;
    const format = inferFormat(materialObj);
    const type = detectResourceType({ resourceType: materialObj.resourceType, format, originalName: materialObj.originalName || materialObj.url });
    return {
        ...materialObj,
        format,
        resourceType: type,
        url: buildCloudinaryUrl({ publicId: materialObj.publicId, url: materialObj.url, resourceType: type, format })
    };
});

// GET /api/subjects/:subjectId/lessons
exports.getLessonsForSubject = async (req, res) => {
    try {
        const lessons = await Lesson.find({ subject: req.params.subjectId })
            .populate({ path: 'createdBy', select: 'name' })
            .sort({ createdAt: 1 });

        const normalized = lessons.map((lesson) => {
            const obj = lesson.toObject();
            obj.materials = normalizeMaterials(obj.materials);
            return obj;
        });

        res.status(200).json({ success: true, data: normalized });
    } catch (err) {
        console.error('getLessonsForSubject error', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/subjects/:subjectId/lessons
exports.createLesson = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.subjectId);
        if (!subject) return res.status(404).json({ success: false, error: 'Subject not found' });

        const userRole = req.user?.role;
        let teacherDoc = null;

        if (userRole === 'teacher') {
            teacherDoc = await Teacher.findOne({ user: req.user.id });
            if (!teacherDoc) return res.status(403).json({ success: false, error: 'Teacher profile not found' });
            if (String(subject.teacher) !== String(teacherDoc._id)) {
                return res.status(403).json({ success: false, error: 'You can only add lessons to your subjects' });
            }
        }

        const uploadedMaterials = (req.files || []).map(file => ({
            url: buildCloudinaryUrl({ publicId: file.filename, url: file.path, resourceType: detectResourceType({ resourceType: file.resource_type, format: file.format, originalName: file.originalname }), format: file.format }),
            publicId: file.filename,
            format: file.format,
            resourceType: detectResourceType({ resourceType: file.resource_type, format: file.format, originalName: file.originalname }),
            originalName: file.originalname,
            size: file.size,
            isLink: false
        }));

        const linkMaterials = mapLinksToMaterials(parseMaterialLinks(req.body.materialLinks));
        const materials = [...uploadedMaterials, ...linkMaterials];

        const lesson = await Lesson.create({
            subject: subject._id,
            title: req.body.title,
            description: req.body.description || '',
            materials,
            createdBy: teacherDoc ? teacherDoc._id : subject.teacher
        });

        const populated = await lesson.populate({ path: 'createdBy', select: 'name' });
        const normalized = populated.toObject();
        normalized.materials = normalizeMaterials(normalized.materials);
        res.status(201).json({ success: true, data: normalized });
    } catch (err) {
        console.error('createLesson error', err);
        res.status(400).json({ success: false, error: err.message });
    }
};

// DELETE /api/lessons/:id
exports.deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.status(404).json({ success: false, error: 'Lesson not found' });

        const userRole = req.user?.role;
        if (userRole === 'teacher') {
            const teacherDoc = await Teacher.findOne({ user: req.user.id });
            if (!teacherDoc || String(lesson.createdBy) !== String(teacherDoc._id)) {
                return res.status(403).json({ success: false, error: 'Not allowed to delete this lesson' });
            }
        }

        // Best-effort cleanup on Cloudinary
        if (lesson.materials?.length) {
            await Promise.all(lesson.materials
                .filter(file => file.publicId)
                .map(file => cloudinary.uploader.destroy(file.publicId, { resource_type: detectResourceType({ resourceType: file.resourceType, format: file.format, originalName: file.originalName }) }))); // eslint-disable-line no-await-in-loop
        }

        await lesson.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.error('deleteLesson error', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// PUT /api/lessons/:id
exports.updateLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.status(404).json({ success: false, error: 'Lesson not found' });

        const userRole = req.user?.role;
        if (userRole === 'teacher') {
            const teacherDoc = await Teacher.findOne({ user: req.user.id });
            if (!teacherDoc || String(lesson.createdBy) !== String(teacherDoc._id)) {
                return res.status(403).json({ success: false, error: 'Not allowed to edit this lesson' });
            }
        }

        const updates = {};
        if (req.body.title) updates.title = req.body.title;
        if (req.body.description !== undefined) updates.description = req.body.description;

        const linkMaterials = mapLinksToMaterials(parseMaterialLinks(req.body.materialLinks));
        const hasNewFiles = req.files && req.files.length > 0;
        const hasNewLinks = linkMaterials.length > 0;

        if (hasNewFiles || hasNewLinks) {
            const newMaterials = [];

            if (hasNewFiles) {
                newMaterials.push(...req.files.map(file => ({
                    url: buildCloudinaryUrl({ publicId: file.filename, url: file.path, resourceType: detectResourceType({ resourceType: file.resource_type, format: file.format, originalName: file.originalname }), format: file.format }),
                    publicId: file.filename,
                    format: file.format,
                    resourceType: detectResourceType({ resourceType: file.resource_type, format: file.format, originalName: file.originalname }),
                    originalName: file.originalname,
                    size: file.size,
                    isLink: false
                })));
            }

            if (hasNewLinks) {
                newMaterials.push(...linkMaterials);
            }

            // remove old cloudinary assets only for uploads
            if (lesson.materials?.length) {
                await Promise.all(lesson.materials
                    .filter(file => file.publicId)
                    .map(file => cloudinary.uploader.destroy(file.publicId, { resource_type: detectResourceType({ resourceType: file.resourceType, format: file.format, originalName: file.originalName }) })));
            }

            updates.materials = newMaterials;
        }

        const updated = await Lesson.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
            .populate({ path: 'createdBy', select: 'name' });

        const normalized = updated.toObject();
        normalized.materials = normalizeMaterials(normalized.materials);

        res.status(200).json({ success: true, data: normalized });
    } catch (err) {
        console.error('updateLesson error', err);
        res.status(400).json({ success: false, error: err.message });
    }
};
