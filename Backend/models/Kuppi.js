const mongoose = require('mongoose');

const kuppiSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    subject: {
        type: String,
        required: [true, 'Please add a subject']
    },
    videoUrl: {
        type: String,
        required: [true, 'Please add a video URL']
    },
    thumbnailUrl: {
        type: String
    },
    duration: {
        type: Number, // in minutes
        required: [true, 'Please add duration']
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',

        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Kuppi', kuppiSchema);