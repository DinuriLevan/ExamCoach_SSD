require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');

async function getToken() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = require('./models/User');
        const user = await User.findOne({role: 'student'});
        if (!user) {
            console.log("No student user found in the database. Please register one first.");
        } else {
            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
            fs.writeFileSync('clean_token.txt', token);
        }
    } catch(err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
getToken();
