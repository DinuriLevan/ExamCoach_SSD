const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// FIX (SECURITY_AUDIT.md Finding 6 — A02 Security Misconfiguration): the real Cloudinary
// account secret used to be hardcoded here as a literal string (and duplicated again in
// middleware/uploadMiddleware.js and controllers/quizController.js), even though .env already
// provides CLOUDINARY_URL. This file is now the ONLY place Cloudinary is configured — every
// other file imports the already-configured `cloudinary` export from here instead of calling
// cloudinary.config() with its own copy of the secret. cloudinary.config(true) forces the SDK
// to (re)parse cloud_name/api_key/api_secret straight from process.env.CLOUDINARY_URL, so the
// secret now lives in exactly one place: the environment.
if (!process.env.CLOUDINARY_URL) {
    throw new Error(
        'Missing CLOUDINARY_URL environment variable. Set it in Backend/.env — ' +
        'no hardcoded fallback is provided (see SECURITY_AUDIT.md Finding 6).'
    );
}
cloudinary.config(true);

// Profile pictures (images only)
const profileStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'examcoach_profiles',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    },
});

// Generic image storage (if needed elsewhere)
const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'examcoach_images',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

// Storage for video uploads
const videoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'examcoach_videos',
        allowed_formats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
        resource_type: 'video'
    },
});

// Storage for thumbnail images
const thumbnailStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'examcoach_thumbnails',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [{ width: 320, height: 180, crop: 'fill' }]
    },
});

const uploadImage = multer({ storage: imageStorage });
const uploadVideo = multer({ storage: videoStorage });
const uploadThumbnail = multer({ storage: thumbnailStorage });
// Course materials (documents, slides, videos)
const materialStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const original = (file?.originalname || '').toLowerCase();
        const ext = original.split('.').pop();
        const videoExts = ['mp4', 'mov', 'avi', 'mkv'];
        const imageExts = ['jpg', 'jpeg', 'png'];
        const isVideo = ext && videoExts.includes(ext);
        const isImage = ext && imageExts.includes(ext);
        const resourceType = isVideo ? 'video' : (isImage ? 'image' : 'raw');


        const params = {
            folder: 'examcoach_materials',
            resource_type: resourceType,
            allowed_formats: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'mp4', 'mov', 'avi', 'mkv', 'jpg', 'jpeg', 'png']
        };

        if (resourceType === 'raw') {
            const nameName = (file.originalname || 'file').replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_');
            params.public_id = `${nameName}_${Date.now()}`;
            if (ext) params.public_id += `.${ext}`;
        }

        return params;
    }
});

const profileUpload = multer({ storage: profileStorage });
const materialUpload = multer({ storage: materialStorage });

module.exports = {
    cloudinary,
    uploadImage,
    uploadVideo,
    uploadThumbnail,
    profileUpload,
    materialUpload
};

