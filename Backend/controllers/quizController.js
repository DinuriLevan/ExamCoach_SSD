const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const pdf = require('pdf-parse');
const AIQuiz = require('../models/Quiz');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: 'du1gjenvg',
    api_key: '735518326372853',
    api_secret: 'APN9C79BAZrybhYYiCL69pqelRs'
});

// Initialize the new Google GenAI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log("-----------------------------------------");
console.log("AI QUIZ CONTROLLER LOADED - timestamp: " + Date.now());
console.log("Model: gemini-2.5-flash");
console.log("-----------------------------------------");

// Helper function to extract text from PDF
const extractPdfText = async (filePath) => {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (error) {
        console.error("PDF Parse Error:", error);
        throw new Error("Failed to parse PDF file.");
    }
};

// @desc    Generate a quiz based on uploaded content (text or PDF)
// @route   POST /api/quiz/generate
// @access  Private (Student)
exports.generateQuiz = async (req, res) => {
    let uploadedFiles = []; // To keep track for cleanup

    try {
        const { numQuestions = 5, difficulty = 'Normal', textInput, language = 'English', selectedTypes = ['MCQ'] } = req.body;
        let content = textInput || "";

        // Handle Multiple File Uploads
        if (req.files && req.files.length > 0) {
            for (const fileItem of req.files) {
                uploadedFiles.push(fileItem.path);

                if (fileItem.mimetype === 'application/pdf') {
                    const pdfText = await extractPdfText(fileItem.path);
                    content += "\n\n" + pdfText;
                } else if (fileItem.mimetype === 'text/plain') {
                    const fileText = fs.readFileSync(fileItem.path, 'utf8');
                    content += "\n\n" + fileText;
                }
            }
        }

        // Validate Input
        if (!content || content.trim().length === 0) {
            // Cleanup
            uploadedFiles.forEach(path => {
                if (fs.existsSync(path)) fs.unlinkSync(path);
            });
            return res.status(400).json({
                success: false,
                error: 'Please provide text or upload at least one document (PDF/TXT) to generate a quiz.'
            });
        }

        // Limit content length
        const maxLength = 40000;
        if (content.length > maxLength) {
            content = content.substring(0, maxLength) + "... [Truncated]";
        }

        const prompt = `
            You are an expert teacher. Create a quiz based on the following text content.
            
            **Settings:**
            - **Number of Questions:** ${numQuestions}
            - **Difficulty Level:** ${difficulty}
            - **Output Language:** ${language} (Translate questions/answers if necessary)
            - **Question Types:** ${Array.isArray(selectedTypes) ? selectedTypes.join(', ') : selectedTypes} (Mix these types)
            
            **Input Text:**
            ${content}

            **Output Format:**
            Return a valid JSON object with THREE fields:
            1. "suggestedTimeLimitSeconds": (integer) An adaptive, calculated time limit strictly in seconds (e.g., 300 for 5 mins). Consider the difficulty, number, and type of questions (e.g. Essay takes longer) when calculating this.
            2. "quizTitle": (string) A short, descriptive, and highly professional title summarizing this specific quiz context (e.g. "Advanced Cell Biology Chapter 3 Quiz").
            3. "quiz": A valid JSON array of question objects.
            
            Each question object MUST have a "type" field matching one of: 'MCQ', 'TrueFalse', 'MultiSelect', 'FillBlanks', 'ShortAnswer', 'Essay'.
            
            Structure guide:
            - **MCQ**: { type: "MCQ", question: "...", options: ["A", "B", "C", "D"], correctAnswer: "content of correct option", explanation: "..." }
            - **TrueFalse**: { type: "TrueFalse", question: "...", options: ["True", "False"], correctAnswer: "True", explanation: "..." }
            - **MultiSelect**: { type: "MultiSelect", question: "...", options: ["A", "B", ...], correctAnswer: ["Option A", "Option C"], explanation: "..." } (Correct Answer IS AN ARRAY)
            - **FillBlanks**: { type: "FillBlanks", question: "The capital of France is ______", correctAnswer: "Paris", explanation: "..." } (No options)
            - **ShortAnswer**: { type: "ShortAnswer", question: "...", correctAnswer: "Key phrase", explanation: "..." } (No options)
            - **Essay**: { type: "Essay", question: "...", correctAnswer: "Key points expected in answer...", explanation: "..." } (No options)
            
            Ensure the JSON is valid and strictly follows this structured object format.
        `;

        // Use the new SDK method
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        const response = result.response;

        // Parse JSON from the response text
        let text = "";

        // Handle response content safely for different SDK versions
        if (typeof response.text === 'function') {
            text = response.text();
        } else if (typeof response.text === 'string') {
            text = response.text;
        } else if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts[0].text) {
            text = response.candidates[0].content.parts[0].text;
        } else {
            // Fallback: try to stringify the whole response if structure is unknown, though this likely won't be the quiz JSON
            console.log("Warning: Could not extract text from response in standard way.", response);
            text = JSON.stringify(response);
        }

        // Clean up markdown code blocks if present (Gemini sometimes adds them even with JSON mode)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log("AI Response Length:", text.length);

        let quiz;
        try {
            quiz = JSON.parse(text);
        } catch (e) {
            console.error("JSON Parse Error on text:", text);
            throw new Error("Failed to parse AI response as JSON");
        }

        // Upload PDFs to Cloudinary if they exist
        let mainPdfUrl = null;

        if (req.files && req.files.length > 0) {
            for (const fileItem of req.files) {
                if (fileItem.mimetype === 'application/pdf' && !mainPdfUrl) {
                    try {
                        const uploadResult = await cloudinary.uploader.upload(fileItem.path, {
                            resource_type: "auto",
                            format: "pdf",
                            folder: "examcoach_quizzes",
                            use_filename: true,
                            unique_filename: true
                        });
                        // Just keep the first one as primary for now to prevent breaking frontend schemas
                        mainPdfUrl = uploadResult.secure_url;
                        console.log("PDF Uploaded to Cloudinary:", mainPdfUrl);
                    } catch (uploadError) {
                        console.error("Cloudinary Upload Error:", uploadError);
                    }
                }
            }
        }

        // Cleanup uploaded files
        uploadedFiles.forEach(path => {
            if (fs.existsSync(path)) fs.unlinkSync(path);
        });

        res.status(200).json({
            success: true,
            data: quiz.quiz || quiz, // Fallback if AI skips wrapper
            quizTitle: quiz.quizTitle || "Smart AI Quiz",
            timeLimitSeconds: quiz.suggestedTimeLimitSeconds || (numQuestions * 60),
            sourceContent: content, // Return the source text to be saved later
            pdfUrl: mainPdfUrl || pdfUrl // Return PDF URL if uploaded
        });
    } catch (err) {
        // Cleanup uploaded files on error
        uploadedFiles.forEach(path => {
            if (fs.existsSync(path)) fs.unlinkSync(path);
        });

        console.error("AI Quiz Gen Error:", err);
        res.status(500).json({
            success: false,
            error: err.message || 'Failed to generate quiz. Please try again.'
        });
    }
};

// @desc    Save completed quiz result
// @route   POST /api/quiz/save
// @access  Private (Student)
exports.saveQuizResult = async (req, res) => {
    try {
        const { title, score, totalQuestions, questions, difficulty, sourceContent, pdfUrl } = req.body;

        await AIQuiz.create({
            student: req.user.id,
            title: title || "Smart AI Quiz",
            score,
            totalQuestions,
            difficulty,
            questions,
            sourceContent: sourceContent || "",
            pdfUrl: pdfUrl || null
        });

        res.status(201).json({
            success: true,
            message: 'Quiz result saved'
        });
    } catch (err) {
        console.error("Save Quiz Error:", err);
        res.status(500).json({
            success: false,
            error: 'Failed to save quiz result'
        });
    }
};

// @desc    Get student's quiz history
// @route   GET /api/quiz/history
// @access  Private (Student)
exports.getQuizHistory = async (req, res) => {
    try {
        const history = await AIQuiz.find({ student: req.user.id })
            .select('score totalQuestions difficulty createdAt title sourceContent pdfUrl questions')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (err) {
        console.error("Get History Error:", err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch quiz history'
        });
    }
};

// @desc    Delete an AI quiz from history
// @route   DELETE /api/quiz/history/:id
// @access  Private (Student)
exports.deleteQuizHistory = async (req, res) => {
    try {
        const quizId = req.params.id;
        const studentId = req.user.id; // From authMiddleware

        const deletedQuiz = await AIQuiz.findOneAndDelete({ _id: quizId, student: studentId });

        if (!deletedQuiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found or unauthorized' });
        }

        res.status(200).json({ success: true, message: 'Quiz deleted successfully' });
    } catch (err) {
        console.error("Delete Quiz Error:", err);
        res.status(500).json({ success: false, error: 'Failed to delete quiz' });
    }
};

// @desc    Get Quiz Analytics for Admin
// @route   GET /api/quiz/admin/stats
// @access  Private (Admin)
exports.getAdminAnalytics = async (req, res) => {
    try {
        const totalQuizzes = await AIQuiz.countDocuments();

        // Use aggregation for detailed stats
        const stats = await AIQuiz.aggregate([
            {
                $group: {
                    _id: null,
                    avgScorePercent: { $avg: { $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100] } },
                    totalQuestions: { $sum: "$totalQuestions" },
                    avgQuestionsPerQuiz: { $avg: "$totalQuestions" }
                }
            }
        ]);

        // Difficulty Distribution
        const difficultyDist = await AIQuiz.aggregate([
            { $group: { _id: "$difficulty", count: { $sum: 1 } } }
        ]);

        // Recent Activities (last 10)
        const recentQuizzes = await AIQuiz.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('student', 'name email')
            .select('score totalQuestions difficulty createdAt student');

        // Pass Rate (Score >= 60%)
        // We can do this efficiently with aggregate
        const passedStats = await AIQuiz.aggregate([
            {
                $project: {
                    percentage: { $divide: ["$score", "$totalQuestions"] }
                }
            },
            {
                $match: { percentage: { $gte: 0.6 } } // Assuming 60% pass mark
            },
            { $count: "passed" }
        ]);

        const passedCount = passedStats.length > 0 ? passedStats[0].passed : 0;
        const passRate = totalQuizzes > 0 ? ((passedCount / totalQuizzes) * 100).toFixed(1) : 0;

        res.status(200).json({
            success: true,
            totalQuizzes,
            avgScore: stats.length > 0 ? stats[0].avgScorePercent.toFixed(1) : 0,
            totalQuestionsGenerated: stats.length > 0 ? stats[0].totalQuestions : 0,
            passRate: passRate,
            difficultyDistribution: difficultyDist.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
            recentActivity: recentQuizzes
        });

    } catch (err) {
        console.error("Admin Analytics Error:", err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Explain a concept simply (ELI5)
// @route   POST /api/quiz/explain
// @access  Private (Student)
exports.explainConcept = async (req, res) => {
    try {
        const { question, correctAnswer, userAnswer, sourceContent } = req.body;

        if (!question) {
            return res.status(400).json({ success: false, error: 'Question is required for explanation.' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are a friendly, encouraging tutor for an Exam Preparation Platform.
        A student got a quiz question wrong and asked for a simpler explanation.
        
        Question: "${question}"
        Correct Answer: "${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}"
        Student's Wrong Answer: "${Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer || 'Skipped')}"
        
        Context/Source Material:
        ${sourceContent ? sourceContent.substring(0, 3000) + '...' : 'No source context provided.'}
        
        Task:
        Explain the correct answer and the underlying concept like I am 5 years old (ELI5). 
        Use very simple words, an easy-to-understand everyday analogy, and keep it under 3-4 sentences. Be encouraging!
        Do NOT wrap the response in markdown, JSON, or any special formatting. Just return plain text.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;

        let text = "";
        if (typeof response.text === 'function') {
            text = response.text();
        } else if (typeof response.text === 'string') {
            text = response.text;
        } else if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts[0].text) {
            text = response.candidates[0].content.parts[0].text;
        } else {
            text = "Explanation unavailable due to API response structure.";
            console.error("Unknown response structure:", response);
        }

        res.status(200).json({
            success: true,
            explanation: text.trim()
        });

    } catch (err) {
        console.error("Explain Concept Error:", err);
        res.status(500).json({ success: false, error: 'Failed to generate simple explanation.' });
    }
};

