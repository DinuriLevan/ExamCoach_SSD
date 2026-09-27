const Student = require('../models/Student');
const calendarService = require('../services/calendarService');

/**
 * @desc    Initiate Google Calendar OAuth flow
 * @route   GET /api/calendar/auth
 * @access  Private
 */
const initiateAuth = async (req, res) => {
    try {
        const authUrl = calendarService.getAuthUrl();
        res.json({ authUrl });
    } catch (error) {
        console.error('Error initiating auth:', error);
        res.status(500).json({ message: 'Failed to initiate Google Calendar authorization' });
    }
};

/**
 * @desc    Handle Google Calendar OAuth callback
 * @route   GET /api/calendar/callback
 * @access  Public
 */
const handleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.redirect(`${process.env.FRONTEND_URL || 'https://exam-coach-sigma.vercel.app'}/calendar-callback?error=no_code`);
        }

        // Exchange code for tokens
        const tokens = await calendarService.getTokensFromCode(code);

        // Extract student ID from state parameter (passed during auth initiation)
        const studentId = state;

        if (!studentId) {
            return res.redirect(`${process.env.FRONTEND_URL || 'https://exam-coach-sigma.vercel.app'}/calendar-callback?error=no_student`);
        }

        // Update student with tokens
        const student = await Student.findById(studentId);
        if (!student) {
            return res.redirect(`${process.env.FRONTEND_URL || 'https://exam-coach-sigma.vercel.app'}/calendar-callback?error=student_not_found`);
        }

        student.googleCalendarConnected = true;
        student.googleAccessToken = tokens.access_token;
        student.googleRefreshToken = tokens.refresh_token;
        student.googleTokenExpiry = new Date(tokens.expiry_date);
        await student.save();

        // Redirect to success page
        res.redirect(`${process.env.FRONTEND_URL || 'https://exam-coach-sigma.vercel.app'}/calendar-callback?success=true`);
    } catch (error) {
        console.error('Error handling callback:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'https://exam-coach-sigma.vercel.app'}/calendar-callback?error=auth_failed`);
    }
};

/**
 * @desc    Disconnect Google Calendar
 * @route   POST /api/calendar/disconnect
 * @access  Private
 */
const disconnectCalendar = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user.id });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Clear Google Calendar tokens
        student.googleCalendarConnected = false;
        student.googleAccessToken = undefined;
        student.googleRefreshToken = undefined;
        student.googleTokenExpiry = undefined;
        await student.save();

        res.json({ message: 'Google Calendar disconnected successfully' });
    } catch (error) {
        console.error('Error disconnecting calendar:', error);
        res.status(500).json({ message: 'Failed to disconnect Google Calendar' });
    }
};

/**
 * @desc    Get calendar connection status
 * @route   GET /api/calendar/status
 * @access  Private
 */
const getConnectionStatus = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user.id });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({
            connected: student.googleCalendarConnected || false,
            tokenExpiry: student.googleTokenExpiry
        });
    } catch (error) {
        console.error('Error getting connection status:', error);
        res.status(500).json({ message: 'Failed to get calendar connection status' });
    }
};

/**
 * @desc    Manually sync study plan to calendar
 * @route   POST /api/calendar/sync/:studyPlanId
 * @access  Private
 */
const syncStudyPlan = async (req, res) => {
    try {
        const { studyPlanId } = req.params;

        const student = await Student.findOne({ user: req.user.id }).select('+googleAccessToken +googleRefreshToken');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (!student.googleCalendarConnected) {
            return res.status(400).json({ message: 'Google Calendar not connected' });
        }

        // Check if token needs refresh
        let tokens = {
            access_token: student.googleAccessToken,
            refresh_token: student.googleRefreshToken,
            expiry_date: student.googleTokenExpiry
        };

        if (new Date() >= new Date(student.googleTokenExpiry)) {
            // Refresh token
            const newTokens = await calendarService.refreshAccessToken(student.googleRefreshToken);
            tokens = newTokens;

            // Update student with new tokens
            student.googleAccessToken = newTokens.access_token;
            student.googleTokenExpiry = new Date(newTokens.expiry_date);
            await student.save();
        }

        // Get study plan
        const StudyPlan = require('../models/StudyPlan');
        const studyPlan = await StudyPlan.findById(studyPlanId);
        if (!studyPlan) {
            return res.status(404).json({ message: 'Study plan not found' });
        }

        // Create events on Google Calendar
        const events = await calendarService.createStudyPlanEvents(tokens, studyPlan);

        res.json({
            message: 'Study plan synced to Google Calendar successfully',
            eventsCreated: events.length
        });
    } catch (error) {
        console.error('Error syncing study plan:', error);
        res.status(500).json({ message: 'Failed to sync study plan to Google Calendar' });
    }
};

module.exports = {
    initiateAuth,
    handleCallback,
    disconnectCalendar,
    getConnectionStatus,
    syncStudyPlan
};
