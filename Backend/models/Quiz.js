const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'Generated Quiz'
    },
    difficulty: {
        type: String,
        required: true
    },
    sourceContent: {
        type: String,
        required: false
    },
    pdfUrl: {
        type: String, // URL to the stored PDF file
        required: false
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    questions: [{
        type: {
            type: String,
            required: true,
            enum: ['MCQ', 'TrueFalse', 'MultiSelect', 'FillBlanks', 'ShortAnswer', 'Essay']
        },
        question: { type: String, required: true },
        options: [{ type: String }],
        correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
        explanation: { type: String },
        userAnswer: { type: mongoose.Schema.Types.Mixed }, // Can be string or array
        maxMarks: { type: Number, default: 1 },
        obtainedMarks: { type: Number, default: 0 }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AIQuiz', QuizSchema);
