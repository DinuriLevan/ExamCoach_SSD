
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB Atlas
connectDB();

const app = express();

// Use http.createServer so that Socket.io can share
// the same port as the REST API (required for real-time features)
const server = http.createServer(app);
// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// ── Socket.io Setup ──────────────────────────────────────────
// CORS origins must match the frontend dev/prod URLs.
// To add more origins update FRONTEND_URL in .env or extend the array below.
const io = new Server(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175'
        ],
        methods: ['GET', 'POST']
    }
});

// Attach io to the app so controllers can emit events via req.app.get('io')
app.set('io', io);

// ── Express Middleware ───────────────────────────────────────
app.use(express.json()); // Parse incoming JSON request bodies
app.use(cors({
  origin: "*"
}));        // Allow cross-origin requests from the frontend

// Health-check route
app.get('/', (req, res) => {
    res.send('ExamCoach API is running...');
});

// ── REST API Routes ──────────────────────────────────────────
app.use('/api/auth',     require('./routes/authRoutes'));    // Authentication (login, register, add-teacher)
app.use('/api/teachers', require('./routes/teacherRoutes')); // Teacher CRUD
app.use('/api/students', require('./routes/studentRoutes')); // Student CRUD

// ── Quiz Routes ──────────────────────────────────────────────
// All quiz-related endpoints: create, attempt, verify, results
const quizRoutes = require('./routes/quizzRoutes');
app.use('/api/quizzes', quizRoutes);

// ── Kuppi (Video Lesson) Routes — REMOVED ───────────────────
// The kuppi/video-lesson feature has been removed from this system.
// The route file still exists at routes/kuppiRoutes.js but is NOT mounted.
// To re-enable, uncomment the two lines below:
// const kuppiRoutes = require('./routes/kuppiRoutes');
// app.use('/api/kuppi', kuppiRoutes);

// ========== Socket.io — Cheating Detection ==========
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Student or teacher joins a quiz room
    socket.on('join-quiz', (data) => {
        const { quizId, role, studentName } = data;
        const room = `quiz-${quizId}`;
        socket.join(room);
        socket.quizRoom = room;
        socket.userRole = role;
        socket.studentName = studentName;
        console.log(`${role} "${studentName || 'teacher'}" joined room: ${room}`);
    });

    // Teacher joins monitoring room to receive alerts from all quizzes
    socket.on('join-teacher-monitor', (data) => {
        socket.join('teacher-monitor');
        socket.userRole = 'teacher';
        console.log('Teacher joined global monitor room:', socket.id);
    });

    // Student switched tab — relay to all teachers in the quiz room + global monitor
    socket.on('tab-switch', (data) => {
        console.log(`⚠️  Tab switch detected — Student: ${data.studentName}, Quiz: ${data.quizTitle}, Count: ${data.switchCount}`);

        const room = `quiz-${data.quizId}`;
        // Broadcast to teachers in specific quiz room
        socket.to(room).emit('student-tab-switch', data);
        // Broadcast to all teachers in global monitor room
        socket.to('teacher-monitor').emit('student-tab-switch', data);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});
// Auth Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/study-plan', require('./routes/studyPlanRoutes'));
app.use('/api/calendar', require('./routes/calendarRoutes'));
app.use('/api/quiz', require('./routes/quizRoutes'));

app.use('/api/streams', require('./routes/streamRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/lessons', require('./routes/lessonRoutes'));

// AI Routes
app.use('/api/ai', require('./routes/aiRoutes'));

// Admin Routes
app.use('/api/admin', require('./routes/platformOverviewRoutes'));

// Error handler to return JSON (e.g., multer/cloudinary errors)
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('Unhandled error', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Server error' });
});


// Start server
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = { app, server };
