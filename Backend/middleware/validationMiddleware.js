// ============================================================
//  Validation Middleware
//  All incoming request bodies are validated here before they
//  reach the controller.  Return 400 early so controllers can
//  assume the data is well-formed.
// ============================================================

// ── validateKuppiUpload — DISABLED ──────────────────────────
// Kuppi (video lesson) feature has been removed from the system.
// This validator is kept for reference only.  It is not imported
// or used anywhere in the active codebase.
//
// const validateKuppiUpload = (req, res, next) => {
//     const { title, description, subject, duration } = req.body;
//     const hasVideoFile = req.files && req.files.video && req.files.video.length > 0;
//     const hasVideoUrl = req.body.videoUrl;
//
//     // VALIDATION: All text fields are required
//     if (!title || !description || !subject || !duration) {
//         return res.status(400).json({ success: false, error: 'Please provide all required fields' });
//     }
//
//     // VALIDATION: Must supply either an uploaded video file or an external URL
//     if (!hasVideoFile && !hasVideoUrl) {
//         return res.status(400).json({ success: false, error: 'Video file or video URL is required' });
//     }
//
//     // VALIDATION: Duration must be a positive number
//     if (duration <= 0) {
//         return res.status(400).json({ success: false, error: 'Duration must be positive' });
//     }
//
//     next();
// };

// ── validateQuizCreation ─────────────────────────────────────
// Applied to: POST /api/quizzes
// Runs BEFORE the createQuiz controller so the DB is only hit
// when all required data is present and structurally correct.
const validateQuizCreation = (req, res, next) => {
    const { title, subject, questions } = req.body;

    // VALIDATION: Quiz must have a title, a subject, and at least one question
    if (!title || !subject || !questions || questions.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Please provide title, subject, and at least one question'
        });
    }

    // VALIDATION: Each question must have question text, ≥2 options,
    // and a valid correctAnswer index within the options array
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (
            !q.question ||
            !q.options ||
            q.options.length < 2 ||
            q.correctAnswer === undefined ||
            q.correctAnswer >= q.options.length
        ) {
            return res.status(400).json({
                success: false,
                error: `Invalid question ${i + 1}: must have text, at least 2 options, and a valid correctAnswer index`
            });
        }
    }

    // All validations passed — proceed to controller
    next();
};

// NOTE: validateKuppiUpload is intentionally NOT exported (feature removed)
module.exports = { validateQuizCreation };