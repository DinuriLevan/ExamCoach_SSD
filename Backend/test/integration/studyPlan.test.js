process.env.NODE_ENV = 'test';

const request = require('supertest');

// ── Mock AI service ───────────────────────────────────────────
const mockGenerateDetailedTimetable = jest.fn();
jest.mock('../../services/aiService', () => ({
    generateDetailedTimetable: mockGenerateDetailedTimetable,
    generateStudyPlan: jest.fn(),
    extractTextFromPDF: jest.fn()
}));

// ── Mock StudyPlan model ──────────────────────────────────────
const mockStudyPlanSave = jest.fn().mockResolvedValue(undefined);
const mockStudyPlanModel = jest.fn().mockImplementation(function StudyPlan(data) {
    Object.assign(this, data);
    this.save = mockStudyPlanSave;
});
mockStudyPlanModel.findOne = jest.fn();
mockStudyPlanModel.findOneAndDelete = jest.fn();
mockStudyPlanModel.create = jest.fn();

// ── Mock Student model ────────────────────────────────────────
const mockStudentModel = {
    findOne: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) })
};

jest.mock('../../models/StudyPlan', () => mockStudyPlanModel);
jest.mock('../../models/Student', () => mockStudentModel);
jest.mock('../../services/calendarService', () => ({
    createStudyPlanEvents: jest.fn(),
    deleteStudyPlanEvents: jest.fn(),
    refreshAccessToken: jest.fn()
}));

// ── Mock cloudinary ───────────────────────────────────────────
const noopMiddleware = (req, _res, next) => next();
jest.mock('../../config/cloudinary', () => ({
    cloudinary: { uploader: { upload_stream: jest.fn(), destroy: jest.fn() } },
    profileUpload: { single: jest.fn(() => noopMiddleware) },
    materialUpload: { array: jest.fn(() => noopMiddleware) },
    uploadImage: { single: jest.fn(() => noopMiddleware) },
    uploadVideo: { single: jest.fn(() => noopMiddleware) },
    uploadThumbnail: { single: jest.fn(() => noopMiddleware) }
}));

// ── Mock auth middleware ──────────────────────────────────────
jest.mock('../../middleware/authMiddleware', () => ({
    protect: (req, _res, next) => {
        req.user = { id: 'student-test-id', role: 'student' };
        next();
    },
    authorize: (...roles) => (req, res, next) => {
        if (roles.includes(req.user.role)) return next();
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
}));

const { app } = require('../../index');

// Reusable mock timetable with toObject on subjectSummary items
const makeSubjectSummary = (subject) => ({
    subject,
    totalTopics: 2,
    studySessions: 2,
    revisionSessions: 0,
    totalMinutes: 120,
    completedMinutes: 60,
    toObject() { return { ...this }; }
});

const mockTimetable = {
    totalDays: 2,
    dailySchedule: [
        {
            day: 1,
            date: '2026-04-10',
            tasks: [
                { subject: 'Physics', topic: 'Waves', type: 'study', durationMinutes: 60, isCompleted: true },
                { subject: 'Physics', topic: 'Optics', type: 'study', durationMinutes: 60, isCompleted: false }
            ],
            totalMinutes: 120,
            completedMinutes: 60,
            isCompleted: false,
            note: ''
        }
    ],
    subjectSummary: [makeSubjectSummary('Physics')]
};

// ─────────────────────────────────────────────────────────────
describe('Study Plan — Integration Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockStudyPlanSave.mockResolvedValue(undefined);
        mockStudentModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    });

    // ── POST /api/study-plan ─────────────────────────────────
    describe('POST /api/study-plan', () => {

        test('returns 400 when subjects array is empty', async () => {
            const res = await request(app)
                .post('/api/study-plan')
                .send({ studyHoursPerDay: 3, subjects: [] });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('returns 400 when a subject has no topics', async () => {
            const res = await request(app)
                .post('/api/study-plan')
                .send({ studyHoursPerDay: 3, subjects: [{ name: 'Chemistry', examDate: '2026-05-10', topics: [] }] });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('Chemistry');
        });

        test('returns 500 when AI service fails', async () => {
            mockGenerateDetailedTimetable.mockRejectedValue(new Error('Groq timeout'));

            const res = await request(app)
                .post('/api/study-plan')
                .send({ studyHoursPerDay: 3, subjects: [{ name: 'Physics', examDate: '2026-05-10', topics: ['Waves', 'Optics'] }] });

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
        });

        test('returns 201 and creates plan when all inputs are valid', async () => {
            mockGenerateDetailedTimetable.mockResolvedValue(mockTimetable);
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            mockStudyPlanModel.findOneAndDelete.mockResolvedValue(null);
            mockStudyPlanModel.create.mockResolvedValue({ _id: 'plan-1', user: 'student-test-id' });

            const res = await request(app)
                .post('/api/study-plan')
                .send({ studyHoursPerDay: 3, subjects: [{ name: 'Physics', examDate: '2026-05-10', topics: ['Waves', 'Optics'] }] });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(mockGenerateDetailedTimetable).toHaveBeenCalledTimes(1);
        });
    });

    // ── GET /api/study-plan ──────────────────────────────────
    describe('GET /api/study-plan', () => {

        test('returns 404 when student has no plan', async () => {
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            const res = await request(app).get('/api/study-plan');
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });

        test('returns 200 with plan data when plan exists', async () => {
            const mockPlan = {
                _id: 'plan-1',
                user: 'student-test-id',
                studyHoursPerDay: 3,
                daysUntilNextExam: 20,
                subjects: [{ name: 'Physics', examDate: new Date('2026-05-10'), topics: ['Waves'] }],
                timetable: mockTimetable,
                generatedPlan: [],
                save: mockStudyPlanSave
            };
            mockStudyPlanModel.findOne.mockResolvedValue(mockPlan);

            const res = await request(app).get('/api/study-plan');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data._id).toBe('plan-1');
        });
    });

    // ── DELETE /api/study-plan ───────────────────────────────
    describe('DELETE /api/study-plan', () => {

        test('returns 404 when no plan to delete', async () => {
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            const res = await request(app).delete('/api/study-plan');
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });

        test('returns 200 after successful deletion', async () => {
            const mockPlan = { _id: 'plan-1' };
            mockStudyPlanModel.findOne.mockResolvedValue(mockPlan);
            mockStudyPlanModel.findOneAndDelete.mockResolvedValue(mockPlan);

            const res = await request(app).delete('/api/study-plan');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockStudyPlanModel.findOneAndDelete).toHaveBeenCalledWith({ user: 'student-test-id' });
        });
    });

    // ── GET /api/study-plan/timetable ────────────────────────
    describe('GET /api/study-plan/timetable', () => {

        test('returns 404 when no plan exists', async () => {
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            const res = await request(app).get('/api/study-plan/timetable');
            expect(res.statusCode).toBe(404);
        });

        test('returns 200 with timetable data', async () => {
            const mockPlan = {
                _id: 'plan-1',
                timetable: mockTimetable,
                subjects: [{ name: 'Physics', examDate: new Date('2026-05-10') }]
            };
            mockStudyPlanModel.findOne.mockResolvedValue(mockPlan);
            const res = await request(app).get('/api/study-plan/timetable');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ── GET /api/study-plan/today-progress ───────────────────
    describe('GET /api/study-plan/today-progress', () => {

        test('returns 404 when no plan exists', async () => {
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            const res = await request(app).get('/api/study-plan/today-progress');
            expect(res.statusCode).toBe(404);
        });

        test('returns 200 with today progress', async () => {
            const mockPlan = {
                _id: 'plan-1',
                studyHoursPerDay: 2,
                dailyLogs: [],
                createdAt: new Date(),
                timetable: mockTimetable
            };
            mockStudyPlanModel.findOne.mockResolvedValue(mockPlan);
            const res = await request(app).get('/api/study-plan/today-progress');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ── GET /api/study-plan/progress ─────────────────────────
    describe('GET /api/study-plan/progress', () => {

        test('returns 404 when no plan exists', async () => {
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            const res = await request(app).get('/api/study-plan/progress');
            expect(res.statusCode).toBe(404);
        });

        test('returns 200 with overall progress', async () => {
            const mockPlan = {
                _id: 'plan-1',
                studyHoursPerDay: 2,
                createdAt: new Date(),
                timetable: mockTimetable
            };
            mockStudyPlanModel.findOne.mockResolvedValue(mockPlan);
            const res = await request(app).get('/api/study-plan/progress');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
