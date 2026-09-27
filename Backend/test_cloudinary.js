const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: 'du1gjenvg',
    api_key: '735518326372853',
    api_secret: 'APN9C79BAZrybhYYiCL69pqelRs'
});

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
