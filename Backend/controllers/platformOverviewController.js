const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Stream = require('../models/Stream');
const Subject = require('../models/Subject');
const Quiz = require('../models/Quiz');
const AISummary = require('../models/AISummary');
const StudyPlan = require('../models/StudyPlan');

const getPlatformOverview = async (req, res) => {
    try {
        const now = new Date();

        // ── Totals ───────────────────────────────────────────────
        const [totalStudents, totalTeachers, totalStreams, totalSubjects] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'teacher' }),
            Stream.countDocuments(),
            Subject.countDocuments(),
        ]);

        // ── Registration trend — last 8 weeks ────────────────────
        const weeksAgo8 = new Date(now);
        weeksAgo8.setDate(weeksAgo8.getDate() - 56);

        const registrations = await User.aggregate([
            { $match: { createdAt: { $gte: weeksAgo8 } } },
            {
                $group: {
                    _id: {
                        week: { $isoWeek: '$createdAt' },
                        year: { $isoWeekYear: '$createdAt' },
                        role: '$role'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } }
        ]);

        // Build a clean week-by-week array for the last 8 weeks
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const weekMap = {};
        for (let i = 7; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i * 7);
            const weekNum = getISOWeek(d);
            const year = getISOWeekYear(d);
            const key = `${year}-W${weekNum}`;
            const label = `${monthNames[d.getMonth()]} W${weekNum}`;
            weekMap[key] = { week: key, label, students: 0, teachers: 0 };
        }

        registrations.forEach(({ _id, count }) => {
            const key = `${_id.year}-W${_id.week}`;
            if (weekMap[key]) {
                if (_id.role === 'student') weekMap[key].students += count;
                if (_id.role === 'teacher') weekMap[key].teachers += count;
            }
        });

        const registrationTrend = Object.values(weekMap);

        // ── New this week / this month ────────────────────────────
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [newStudentsWeek, newStudentsMonth, newTeachersWeek, newTeachersMonth] = await Promise.all([
            User.countDocuments({ role: 'student', createdAt: { $gte: startOfWeek } }),
            User.countDocuments({ role: 'student', createdAt: { $gte: startOfMonth } }),
            User.countDocuments({ role: 'teacher', createdAt: { $gte: startOfWeek } }),
            User.countDocuments({ role: 'teacher', createdAt: { $gte: startOfMonth } }),
        ]);

        // ── Recently registered students (proxy for active users) ─
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentlyActiveCount = await User.countDocuments({
            role: 'student',
            createdAt: { $gte: thirtyDaysAgo }
        });

        // ── AI Usage ─────────────────────────────────────────────
        // Groq: quiz generation (Quiz model) + study plan generation (StudyPlan model)
        // Gemini: AI Learning Lab summaries (AISummary model)
        const [groqQuizUsage, groqStudyPlanUsage, geminiUsage, googleCalendarCount] = await Promise.all([
            Quiz.countDocuments(),
            StudyPlan.countDocuments(),
            AISummary.countDocuments(),
            Student.countDocuments({ googleCalendarConnected: true }),
        ]);

        const groqUsage = groqQuizUsage + groqStudyPlanUsage;

        // Monthly AI usage trend (last 6 months)
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const [groqQuizMonthly, groqStudyPlanMonthly, geminiMonthly] = await Promise.all([
            Quiz.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            StudyPlan.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            AISummary.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ])
        ]);

        // Build 6-month map
        const aiMonthMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            aiMonthMap[key] = { month: monthNames[d.getMonth()], groq: 0, gemini: 0 };
        }

        groqQuizMonthly.forEach(({ _id, count }) => {
            const key = `${_id.year}-${_id.month}`;
            if (aiMonthMap[key]) aiMonthMap[key].groq += count;
        });
        groqStudyPlanMonthly.forEach(({ _id, count }) => {
            const key = `${_id.year}-${_id.month}`;
            if (aiMonthMap[key]) aiMonthMap[key].groq += count;
        });
        geminiMonthly.forEach(({ _id, count }) => {
            const key = `${_id.year}-${_id.month}`;
            if (aiMonthMap[key]) aiMonthMap[key].gemini += count;
        });

        const aiUsageTrend = Object.values(aiMonthMap);

        res.json({
            success: true,
            data: {
                totals: { totalStudents, totalTeachers, totalStreams, totalSubjects },
                newRegistrations: {
                    studentsThisWeek: newStudentsWeek,
                    studentsThisMonth: newStudentsMonth,
                    teachersThisWeek: newTeachersWeek,
                    teachersThisMonth: newTeachersMonth,
                },
                recentlyActiveStudents: recentlyActiveCount,
                registrationTrend,
                aiUsage: {
                    groqTotal: groqUsage,
                    groqQuizzes: groqQuizUsage,
                    groqStudyPlans: groqStudyPlanUsage,
                    geminiTotal: geminiUsage,
                    trend: aiUsageTrend,
                },
                googleCalendarIntegrations: googleCalendarCount,
            }
        });

    } catch (err) {
        console.error('Admin overview error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// ISO week helpers (no external lib needed)
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getISOWeekYear(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
}

module.exports = { getPlatformOverview };
