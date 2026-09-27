const mockSubjectModel = {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    findByIdAndUpdate: jest.fn()
};

const mockStreamModel = {
    findById: jest.fn(),
    exists: jest.fn()
};

const mockTeacherModel = {
    findById: jest.fn(),
    exists: jest.fn(),
    findOne: jest.fn()
};

const mockLessonModel = {
    find: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
};

const mockCloudinaryUrl = jest.fn((publicId, options = {}) => {
    const extension = options.format ? `.${options.format}` : '';
    return `https://cloudinary.test/${options.resource_type || 'raw'}/${publicId}${extension}`;
});

const mockCloudinaryDestroy = jest.fn().mockResolvedValue({ result: 'ok' });

jest.mock('../../models/Subject', () => mockSubjectModel);
jest.mock('../../models/Stream', () => mockStreamModel);
jest.mock('../../models/Teacher', () => mockTeacherModel);
jest.mock('../../models/Lesson', () => mockLessonModel);

jest.mock('cloudinary', () => ({
    v2: {
        url: mockCloudinaryUrl,
        uploader: {
            destroy: mockCloudinaryDestroy
        }
    }
}), { virtual: true });

jest.mock('../../config/cloudinary', () => ({}));

const subjectController = require('../../controllers/subjectController');
const lessonController = require('../../controllers/lessonController');

const buildRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
});

describe('Course Management (My Courses) Controllers', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockCloudinaryUrl.mockImplementation((publicId, options = {}) => {
            const extension = options.format ? `.${options.format}` : '';
            return `https://cloudinary.test/${options.resource_type || 'raw'}/${publicId}${extension}`;
        });

        mockCloudinaryDestroy.mockResolvedValue({ result: 'ok' });
    });

    describe('subjectController.getSubjects', () => {
        test('returns 200 with subjects on success', async () => {
            const req = { query: { stream: 'stream-1', teacher: 'teacher-1' } };
            const res = buildRes();
            const subjects = [{ _id: 'sub-1', name: 'Physics' }];

            const sortMock = jest.fn().mockResolvedValue(subjects);
            const secondPopulate = jest.fn().mockReturnValue({ sort: sortMock });
            const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });

            mockSubjectModel.find.mockReturnValue({ populate: firstPopulate });

            await subjectController.getSubjects(req, res);

            expect(mockSubjectModel.find).toHaveBeenCalledWith({ stream: 'stream-1', teacher: 'teacher-1' });
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: subjects });
        });

        test('returns 500 when fetching subjects fails', async () => {
            const req = { query: {} };
            const res = buildRes();

            mockSubjectModel.find.mockImplementation(() => {
                throw new Error('Subject query failed');
            });

            await subjectController.getSubjects(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Subject query failed' });
        });
    });

    describe('subjectController.createSubject', () => {
        test('returns 201 when subject is created successfully', async () => {
            const req = {
                body: {
                    name: 'Mathematics',
                    stream: 'stream-1',
                    teacher: 'teacher-1',
                    description: 'Core subject'
                }
            };
            const res = buildRes();

            const createdSubject = { _id: 'sub-1' };
            const populatedSubject = { _id: 'sub-1', name: 'Mathematics' };

            mockStreamModel.findById.mockResolvedValue({ _id: 'stream-1' });
            mockTeacherModel.findById.mockResolvedValue({ _id: 'teacher-1' });
            mockSubjectModel.create.mockResolvedValue(createdSubject);

            const secondPopulate = jest.fn().mockResolvedValue(populatedSubject);
            const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
            mockSubjectModel.findById.mockReturnValue({ populate: firstPopulate });

            await subjectController.createSubject(req, res);

            expect(mockSubjectModel.create).toHaveBeenCalledWith({
                name: 'Mathematics',
                stream: 'stream-1',
                teacher: 'teacher-1',
                description: 'Core subject'
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: populatedSubject });
        });

        test('returns 400 when stream is invalid', async () => {
            const req = {
                body: {
                    name: 'Mathematics',
                    stream: 'invalid-stream',
                    teacher: 'teacher-1'
                }
            };
            const res = buildRes();

            mockStreamModel.findById.mockResolvedValue(null);

            await subjectController.createSubject(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid stream' });
        });

        test('returns 409 when duplicate subject exists in stream', async () => {
            const req = {
                body: {
                    name: 'Mathematics',
                    stream: 'stream-1',
                    teacher: 'teacher-1'
                }
            };
            const res = buildRes();

            mockStreamModel.findById.mockResolvedValue({ _id: 'stream-1' });
            mockTeacherModel.findById.mockResolvedValue({ _id: 'teacher-1' });
            mockSubjectModel.create.mockRejectedValue({ code: 11000 });

            await subjectController.createSubject(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Subject with this name already exists in the selected stream'
            });
        });
    });

    describe('subjectController.deleteSubject', () => {
        test('returns 200 and deletes subject with related lessons', async () => {
            const req = { params: { id: 'sub-1' } };
            const res = buildRes();

            const deleteOneMock = jest.fn().mockResolvedValue(undefined);
            mockSubjectModel.findById.mockResolvedValue({ _id: 'sub-1', deleteOne: deleteOneMock });
            mockLessonModel.deleteMany.mockResolvedValue({ deletedCount: 3 });

            await subjectController.deleteSubject(req, res);

            expect(mockLessonModel.deleteMany).toHaveBeenCalledWith({ subject: 'sub-1' });
            expect(deleteOneMock).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
        });

        test('returns 404 when subject does not exist', async () => {
            const req = { params: { id: 'missing-subject' } };
            const res = buildRes();

            mockSubjectModel.findById.mockResolvedValue(null);

            await subjectController.deleteSubject(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Subject not found' });
        });
    });

    describe('lessonController.getLessonsForSubject', () => {
        test('returns 200 with normalized lesson materials on success', async () => {
            const req = { params: { subjectId: 'sub-1' } };
            const res = buildRes();

            const lessonDocs = [
                {
                    toObject: () => ({
                        _id: 'lesson-1',
                        title: 'Introduction',
                        materials: [
                            {
                                publicId: 'materials/doc-1.pdf',
                                format: 'pdf',
                                resourceType: 'raw',
                                originalName: 'doc-1.pdf',
                                url: 'https://old-url/doc-1.pdf'
                            }
                        ]
                    })
                }
            ];

            const sortMock = jest.fn().mockResolvedValue(lessonDocs);
            const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
            mockLessonModel.find.mockReturnValue({ populate: populateMock });

            await lessonController.getLessonsForSubject(req, res);

            expect(mockLessonModel.find).toHaveBeenCalledWith({ subject: 'sub-1' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.any(Array)
            }));

            const payload = res.json.mock.calls[0][0];
            expect(payload.data[0].materials[0].url).toContain('materials/doc-1.pdf');
            expect(mockCloudinaryUrl).toHaveBeenCalled();
        });

        test('returns 500 when lesson query fails', async () => {
            const req = { params: { subjectId: 'sub-1' } };
            const res = buildRes();

            mockLessonModel.find.mockImplementation(() => {
                throw new Error('Lesson query failed');
            });

            await lessonController.getLessonsForSubject(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Lesson query failed' });
        });
    });
});
