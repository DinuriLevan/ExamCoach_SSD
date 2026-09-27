const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

async function testPdfUpload() {
    try {
        const filePath = path.join(__dirname, 'test.pdf');

        // Create a dummy PDF if it doesn't exist
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const response = await axios.post('http://localhost:5001/api/ai/summarize', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('Success:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testPdfUpload();
