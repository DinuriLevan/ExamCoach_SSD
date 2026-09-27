const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctAnswer: {
        type: Number, // index of correct option
        required: true
    },
    explanation: {
        type: String
    }
});

const quizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title']
    },
    description: {
        type: String
    },
    subject: {
        type: String,
        required: [true, 'Please add a subject']
    },
    questions: [questionSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    },
    timeLimit: {
        type: Number, // in minutes
        default: 30
    },
    maxAttempts: {
        type: Number,
        default: 1
    },
    enrollmentKey: {
        type: String,
        default: ''
    },
    quizPassword: {
        type: String,
        default: ''
    },
    enrollmentStartTime: {
        type: Date
    },
    enrollmentEndTime: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    examCategory: {
        type: String,
        enum: ['AL', 'OL'],
        default: null
    },
    totalQuestions: {
        type: Number,
        default: function() {
            return this.questions.length;
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Quiz', quizSchema);