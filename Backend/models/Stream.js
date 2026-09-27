const mongoose = require('mongoose');

// Represents A/L streams (e.g., Physical Science, Commerce)
const streamSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Please add a stream name'],
		unique: true,
		trim: true
	},
	description: {
		type: String,
		default: ''
	}
}, { timestamps: true });

module.exports = mongoose.model('Stream', streamSchema);
