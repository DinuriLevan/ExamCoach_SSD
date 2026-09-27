const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'du1gjenvg',
    api_key: process.env.CLOUDINARY_API_KEY || '735518326372853',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'APN9C79BAZrybhYYiCL69pqelRs'
});

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
