const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    // FIX (SECURITY_AUDIT.md Finding 7 — A04 Cryptographic Failures): enrollmentKey is
    // intentionally NOT hashed. Unlike quizPassword below, it functions as a reusable join
    // code — the owning teacher must be able to read the exact original value back (to share
    // it with students, display it in the edit form, etc.), and it is also looked up directly
    // via Quiz.find({ enrollmentKey }) in quizzController.enrollToQuiz, which a one-way hash
    // would break. It is a shareable identifier, not a write-only secret. Read-access to it is
    // restricted to the owning teacher/admin at the controller layer (see getQuiz).
    enrollmentKey: {
        type: String,
        default: ''
    },
    // FIX (SECURITY_AUDIT.md Finding 7 — A04 Cryptographic Failures): this used to be stored
    // and compared as a plain string (`quiz.quizPassword !== quizPassword`). It is now hashed
    // with bcrypt in the pre-save hook below, exactly like User.password, and is never sent
    // back to the client (see quizzController.getQuiz) — it is write-only from this point on.
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

// FIX (SECURITY_AUDIT.md Finding 7): hash quizPassword whenever it is set/changed — mirrors
// the pattern already used for User.password in models/User.js. Only fires on `.save()`
// (i.e. `Quiz.create(...)` and `quiz.save()`), which is why quizzController.updateQuiz was
// changed to load-then-save instead of calling findByIdAndUpdate directly.
quizSchema.pre('save', async function () {
    if (!this.isModified('quizPassword') || !this.quizPassword) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.quizPassword = await bcrypt.hash(this.quizPassword, salt);
});

// Compares a candidate password against the stored bcrypt hash.
quizSchema.methods.matchQuizPassword = async function (candidatePassword) {
    if (!this.quizPassword) return false;
    return bcrypt.compare(candidatePassword || '', this.quizPassword);
};

module.exports = mongoose.model('Quiz', quizSchema);