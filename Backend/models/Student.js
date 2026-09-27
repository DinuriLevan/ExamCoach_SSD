const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    firstName: {
        type: String,
        required: [true, 'Please add a first name']
    },
    lastName: {
        type: String,
        required: [true, 'Please add a last name']
    },
    dob: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
    },
    phone: {
        type: String
    },
    address: {
        type: String
    },
    profilePic: {
        type: String, // URL to the image
        default: 'default-profile.png'
    },
    // Google Calendar Integration
    googleCalendarConnected: {
        type: Boolean,
        default: false
    },
    googleAccessToken: {
        type: String,
        select: false // Don't return in queries by default for security
    },
    googleRefreshToken: {
        type: String,
        select: false // Don't return in queries by default for security
    },
    googleTokenExpiry: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);
