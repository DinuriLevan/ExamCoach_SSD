const mongoose = require('mongoose');

// Stores lesson metadata and uploaded materials per subject
const lessonSchema = new mongoose.Schema({
	subject: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Subject',
		required: true
	},
	title: {
		type: String,
		required: [true, 'Please add a lesson title'],
		trim: true
	},
	description: {
		type: String,
		default: ''
	},
	materials: [
		{
			url: { type: String, required: true },
			publicId: { type: String },
			format: { type: String },
			resourceType: { type: String },
			originalName: { type: String },
			size: { type: Number }, // bytes
			isLink: { type: Boolean, default: false }
		}
	],
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Teacher',
		required: true
	}
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);
