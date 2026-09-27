
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Check if admin exists
        const adminExists = await User.findOne({ email: 'admin@examcoach.com' });
        if (adminExists) {
            console.log('Admin user already exists');
            process.exit();
        }

        // Create admin user
        await User.create({
            name: 'Admin User',
            email: 'admin@examcoach.com',
            password: 'adminpassword123',
            role: 'admin'
        });

        console.log('Admin user created successfully');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedAdmin();
