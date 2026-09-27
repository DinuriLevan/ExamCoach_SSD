const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    contactNo: {
        type: String,
        required: [true, 'Please add a contact number']
    },
    nic: {
        type: String,
        required: [true, 'Please add NIC'],
        unique: true
    },
    experience: {
        type: String,
        required: [true, 'Please add experience']
    },
    qualification: {
        type: String,
        required: [true, 'Please add qualifications']
    },
    subject: {
        type: String,
        required: [true, 'Please add a subject']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: [true, 'Please select gender']
    },
    dob: {
        type: Date,
        required: [true, 'Please add date of birth']
    },
    phone: {
        type: String
    },
    bio: {
        type: String
    },
    profilePic: {
        type: String,
        default: 'default-profile.png'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Teacher', teacherSchema);
