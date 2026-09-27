const Tesseract = require('tesseract.js');
const { createWorker } = Tesseract;
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execPromise = promisify(exec);

/**
 * Extract text from PDF using OCR (for scanned/image-based PDFs)
 * This is a fallback when regular text extraction fails
 */
const extractTextWithOCR = async (pdfBuffer) => {
    console.log('[OCR] Starting OCR extraction...');
    
    try {
        // First, try to convert PDF to images using pdf-parse metadata
        const pdfData = await pdf(pdfBuffer);
        console.log('[OCR] PDF has', pdfData.numpages, 'pages');
        
        // For now, we'll use Tesseract.js directly on the PDF
        // Note: Tesseract.js can handle PDFs but works better with images
        
        const worker = await createWorker('eng', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        console.log('[OCR] Worker initialized, processing PDF...');
        
        // Process the PDF buffer
        const { data: { text } } = await worker.recognize(pdfBuffer);
        
        await worker.terminate();
        
        console.log('[OCR] Extraction complete, text length:', text.length);
        console.log('[OCR] Sample:', text.substring(0, 200));
        
        return text;
        
    } catch (error) {
        console.error('[OCR] Error:', error.message);
        throw error;
    }
};

/**
 * Smart extraction: Try regular extraction first, fall back to OCR if needed
 */
const smartExtractText = async (pdfBuffer) => {
    console.log('[Smart Extract] Starting smart extraction...');
    
    try {
        // Step 1: Try regular text extraction
        console.log('[Smart Extract] Attempting regular text extraction...');
        const pdfData = await pdf(pdfBuffer);
        const regularText = pdfData.text || '';
        
        console.log('[Smart Extract] Regular extraction result:', regularText.length, 'characters');
        
        // If we got enough text, use it
        if (regularText.trim().length >= 100) {
            console.log('[Smart Extract] ✓ Regular extraction successful');
            return {
                text: regularText,
                method: 'regular',
                pages: pdfData.numpages
            };
        }
        
        // Step 2: Text is too short, try OCR
        console.log('[Smart Extract] Text too short, attempting OCR...');
        const ocrText = await extractTextWithOCR(pdfBuffer);
        
        if (ocrText.trim().length >= 50) {
            console.log('[Smart Extract] ✓ OCR extraction successful');
            return {
                text: ocrText,
                method: 'ocr',
                pages: pdfData.numpages
            };
        }
        
        // Step 3: Both failed
        console.log('[Smart Extract] ✗ Both methods failed');
        return {
            text: '',
            method: 'failed',
            pages: pdfData.numpages
        };
        
    } catch (error) {
        console.error('[Smart Extract] Error:', error.message);
        throw error;
    }
};

/**
 * Extract text from a single image using OCR
 */
const extractTextFromImage = async (imageBuffer) => {
    console.log('[OCR] Extracting text from image...');
    
    try {
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(imageBuffer);
        await worker.terminate();
        
        console.log('[OCR] Image text extracted:', text.length, 'characters');
        return text;
        
    } catch (error) {
        console.error('[OCR] Image extraction error:', error.message);
        throw error;
    }
};

module.exports = {
    extractTextWithOCR,
    smartExtractText,
    extractTextFromImage
};
