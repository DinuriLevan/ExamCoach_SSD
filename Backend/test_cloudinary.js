// FIX (SECURITY_AUDIT.md Finding 6 — A02 Security Misconfiguration): this standalone debug
// script also had the real Cloudinary secret hardcoded as a literal. It now reuses the same
// centrally-configured singleton as the rest of the app (config/cloudinary.js), sourced only
// from process.env.CLOUDINARY_URL.
require('dotenv').config();
const { cloudinary } = require('./config/cloudinary');
const fs = require('fs');

async function testUpload() {
    try {
        fs.writeFileSync('test.txt', 'This is a test file for upload.');
        console.log('Uploading...');

        const result = await cloudinary.uploader.upload('test.txt', {
            resource_type: "raw",
            folder: "examcoach_debug",
            access_mode: 'public'
        });

        console.log('Upload Success!');
        console.log('URL:', result.secure_url);

        // Cleanup
        fs.unlinkSync('test.txt');
    } catch (e) {
        console.error('Upload Failed:', e);
    }
}

testUpload();
