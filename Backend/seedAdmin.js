
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const User = require('./models/User');

dotenv.config();

// FIX (SECURITY_AUDIT.md Finding 5 — A07 Authentication Failures): this script used to
// hardcode a literal admin password ('adminpassword123') directly in committed source,
// so anyone who could read the repository had a working admin credential. A strong random
// password is now generated at run time instead (or read from ADMIN_SEED_PASSWORD if you
// explicitly want to set one for a scripted deploy) and is never written into source or
// persisted anywhere in plaintext — it is only printed once, below, so it can be captured.
const generateStrongPassword = () => crypto.randomBytes(18).toString('base64url'); // 24-char, high-entropy

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

        // FIX (SECURITY_AUDIT.md Finding 5): password is now generated (or supplied via env),
        // never hardcoded.
        const usedEnvPassword = !!process.env.ADMIN_SEED_PASSWORD;
        const adminPassword = process.env.ADMIN_SEED_PASSWORD || generateStrongPassword();

        // Create admin user
        await User.create({
            name: 'Admin User',
            email: 'admin@examcoach.com',
            password: adminPassword,
            role: 'admin'
        });

        console.log('Admin user created successfully.');
        if (!usedEnvPassword) {
            // Printed ONCE, here, at creation time only — never logged again on subsequent runs.
            console.log('==================================================================');
            console.log('GENERATED ADMIN PASSWORD (copy this now, it will not be shown again):');
            console.log(adminPassword);
            console.log('Log in immediately and change this password.');
            console.log('==================================================================');
        }
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedAdmin();
