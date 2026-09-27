const express = require('express');
const router = express.Router();
const multer = require('multer');
const { summarizeText, saveSummary, getHistory, deleteHistoryItem, updateHistoryItem } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// FIX (SECURITY_AUDIT.md Finding 4 — A01 Broken Access Control): none of these routes had
// ANY auth middleware — getHistory/updateHistoryItem/deleteHistoryItem trusted a userId taken
// straight from the URL/body, so anyone could read, edit, or delete ANY user's saved AI
// summaries just by supplying a userId. `protect` is now required on every route; the
// controllers (aiController.js) additionally now use req.user.id instead of the
// client-supplied userId, so a stolen/guessed id in the request can no longer be used to act
// on someone else's data. summarize/save are also gated since they call the paid Gemini API.
router.post('/summarize', protect, upload.array('files', 3), summarizeText);
router.post('/save', protect, upload.single('file'), saveSummary);
router.get('/history/:userId', protect, getHistory);
router.put('/history/:id', protect, updateHistoryItem);
router.delete('/history/:id', protect, deleteHistoryItem);

module.exports = router;
