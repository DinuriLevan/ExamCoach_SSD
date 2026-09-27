const mockStudyPlanSave = jest.fn().mockResolvedValue(undefined);
const mockStudyPlanDeleteOne = jest.fn().mockResolvedValue(undefined);

// ── Mock StudyPlan model ──────────────────────────────────────
const mockStudyPlanModel = jest.fn().mockImplementation(function StudyPlan(data) {
    Object.assign(this, data);
    this.save = mockStudyPlanSave;
});
mockStudyPlanModel.findOne = jest.fn();
mockStudyPlanModel.findOneAndDelete = jest.fn();
mockStudyPlanModel.create = jest.fn();

// ── Mock Student model ────────────────────────────────────────
const mockStudentModel = {
    findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null) // not connected to calendar
    })
};

// ── Mock AI service ───────────────────────────────────────────
const mockGenerateDetailedTimetable = jest.fn();
jest.mock('../../services/aiService', () => ({
    generateDetailedTimetable: mockGenerateDetailedTimetable,
    generateStudyPlan: jest.fn(),
    extractTextFromPDF: jest.fn()
}));

jest.mock('../../models/StudyPlan', () => mockStudyPlanModel);
jest.mock('../../models/Student', () => mockStudentModel);
jest.mock('../../models/User', () => ({ findById: jest.fn() }));
jest.mock('../../services/calendarService', () => ({
    createStudyPlanEvents: jest.fn(),
    deleteStudyPlanEvents: jest.fn(),
    refreshAccessToken: jest.fn()
}));
jest.mock('../../config/cloudinary', () => ({
    cloudinary: { uploader: { upload_stream: jest.fn(), destroy: jest.fn() } },
    profileUpload: { single: jest.fn(() => (req, res, next) => next()) },
    materialUpload: { array: jest.fn(() => (req, res, next) => next()) },
    uploadImage: { single: jest.fn(() => (req, res, next) => next()) },
    uploadVideo: { single: jest.fn(() => (req, res, next) => next()) },
    uploadThumbnail: { single: jest.fn(() => (req, res, next) => next()) }
}));

const {
    createStudyPlan,
    getStudyPlan,
    deleteStudyPlan,
    getTodayProgress,
    getProgress
} = require('../../controllers/studyPlanController');

const buildRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
});

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
                { subject: 'Maths', topic: 'Algebra', type: 'study', durationMinutes: 60, isCompleted: true },
                { subject: 'Maths', topic: 'Calculus', type: 'study', durationMinutes: 60, isCompleted: false }
            ],
            totalMinutes: 120,
            completedMinutes: 60,
            isCompleted: false,
            note: ''
        }
    ],
    subjectSummary: [makeSubjectSummary('Maths')]
};

// ─────────────────────────────────────────────────────────────
describe('Study Plan Controller — Unit Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockStudyPlanSave.mockResolvedValue(undefined);
        mockStudentModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    });

    // ── createStudyPlan ──────────────────────────────────────
    describe('createStudyPlan', () => {

        test('returns 400 when no subjects are provided', async () => {
            const req = { body: { studyHoursPerDay: 3, subjects: [] }, user: { id: 'student-1' } };
            const res = buildRes();
            await createStudyPlan(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        });

        test('returns 400 when a subject has no topics', async () => {
            const req = {
                body: { studyHoursPerDay: 3, subjects: [{ name: 'Maths', examDate: '2026-05-01', topics: [] }] },
                user: { id: 'student-1' }
            };
            const res = buildRes();
            await createStudyPlan(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, error: expect.stringContaining('Maths') })
            );
        });

        test('returns 500 when AI timetable generation fails', async () => {
            mockGenerateDetailedTimetable.mockRejectedValue(new Error('AI unavailable'));
            const req = {
                body: { studyHoursPerDay: 3, subjects: [{ name: 'Maths', examDate: '2026-05-01', topics: ['Algebra'] }] },
                user: { id: 'student-1' }
            };
            const res = buildRes();
            await createStudyPlan(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        });

        test('creates plan successfully and returns 201', async () => {
            mockGenerateDetailedTimetable.mockResolvedValue(mockTimetable);
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            mockStudyPlanModel.findOneAndDelete.mockResolvedValue(null);
            const createdPlan = { _id: 'plan-1', user: 'student-1' };
            mockStudyPlanModel.create.mockResolvedValue(createdPlan);

            const req = {
                body: { studyHoursPerDay: 3, subjects: [{ name: 'Maths', examDate: '2026-05-01', topics: ['Algebra', 'Calculus'] }] },
                user: { id: 'student-1' }
            };
            const res = buildRes();
            await createStudyPlan(req, res);

            expect(mockGenerateDetailedTimetable).toHaveBeenCalledTimes(1);
            expect(mockStudyPlanModel.create).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    // ── getStudyPlan ─────────────────────────────────────────
    describe('getStudyPlan', () => {

        test('returns 404 when no plan exists', async () => {
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            const req = { user: { id: 'student-1' } };
            const res = buildRes();
            await getStudyPlan(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 200 with plan data when plan exists', async () => {
            const mockPlan = {
                _id: 'plan-1',
                user: 'student-1',
                studyHoursPerDay: 3,
                daysUntilNextExam: 20,
                subjects: [{ name: 'Maths', examDate: new Date('2026-05-01'), topics: ['Algebra'] }],
                timetable: mockTimetable,
                generatedPlan: [],
                save: mockStudyPlanSave
            };
            mockStudyPlanModel.findOne.mockResolvedValue(mockPlan);

            const req = { user: { id: 'student-1' } };
            const res = buildRes();
            await getStudyPlan(req, res);

            expect(mockStudyPlanModel.findOne).toHaveBeenCalledWith({ user: 'student-1' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockPlan }));
        });

        test('returns 500 when database query throws', async () => {
            mockStudyPlanModel.findOne.mockRejectedValue(new Error('DB error'));
            const req = { user: { id: 'student-1' } };
            const res = buildRes();
            await getStudyPlan(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── deleteStudyPlan ──────────────────────────────────────
    describe('deleteStudyPlan', () => {

        test('returns 404 when plan does not exist', async () => {
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            const req = { user: { id: 'student-1' } };
            const res = buildRes();
            await deleteStudyPlan(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('deletes plan and returns 200', async () => {
            const mockPlan = { _id: 'plan-1' };
            mockStudyPlanModel.findOne.mockResolvedValue(mockPlan);
            mockStudyPlanModel.findOneAndDelete.mockResolvedValue(mockPlan);

            const req = { user: { id: 'student-1' } };
            const res = buildRes();
            await deleteStudyPlan(req, res);

            expect(mockStudyPlanModel.findOneAndDelete).toHaveBeenCalledWith({ user: 'student-1' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    // ── getTodayProgress ─────────────────────────────────────
    describe('getTodayProgress', () => {

        test('returns 404 when no plan exists', async () => {
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            const req = { user: { id: 'student-1' } };
            const res = buildRes();
            await getTodayProgress(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 200 with progress data when plan exists', async () => {
            const mockPlan = {
                _id: 'plan-1',
                studyHoursPerDay: 2,
                dailyLogs: [],
                timetable: mockTimetable,
                createdAt: new Date()
            };
            mockStudyPlanModel.findOne.mockResolvedValue(mockPlan);
            const req = { user: { id: 'student-1' } };
            const res = buildRes();
            await getTodayProgress(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    // ── getProgress ──────────────────────────────────────────
    describe('getProgress', () => {

        test('returns 404 when no plan exists', async () => {
            mockStudyPlanModel.findOne.mockResolvedValue(null);
            const req = { user: { id: 'student-1' } };
            const res = buildRes();
            await getProgress(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 200 with overall progress stats', async () => {
            const mockPlan = {
                _id: 'plan-1',
                studyHoursPerDay: 2,
                createdAt: new Date(),
                timetable: mockTimetable
            };
            mockStudyPlanModel.findOne.mockResolvedValue(mockPlan);
            const req = { user: { id: 'student-1' } };
            const res = buildRes();
            await getProgress(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });
});
