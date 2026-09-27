const multer = require('multer');
// FIX (SECURITY_AUDIT.md Finding 6 — A02 Security Misconfiguration): this file used to call
// cloudinary.config() itself with `process.env.X || '<hardcoded literal secret>'` fallbacks,
// meaning the real Cloudinary secret was duplicated in source even when .env was present.
// Cloudinary is now configured in exactly one place (config/cloudinary.js, sourced only from
// process.env.CLOUDINARY_URL) — this file just reuses that already-configured singleton.
const { cloudinary } = require('../config/cloudinary');

// Use memory storage so we can read the file buffer before uploading to Cloudinary
const memoryStorage = multer.memoryStorage();

const upload = multer({
    storage: memoryStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        const ext = file.originalname.toLowerCase();
        if (allowed.includes(file.mimetype) || ext.endsWith('.pdf') || ext.endsWith('.ppt') || ext.endsWith('.pptx')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and PPT/PPTX files are allowed'), false);
        }
    }
});

module.exports = { upload, cloudinary };
