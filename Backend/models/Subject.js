const mongoose = require('mongoose');

// Represents a subject within a Stream, taught by a Teacher
const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a subject name'],
        trim: true
    },
    stream: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stream',
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    description: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Prevent duplicate subject names within the same stream
subjectSchema.index({ name: 1, stream: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
