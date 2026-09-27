process.env.NODE_ENV = 'test';

const request = require('supertest');

const mockSubjectModel = {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    findByIdAndUpdate: jest.fn()
};

const mockLessonModel = {
    find: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
};

const mockTeacherModel = {
    findById: jest.fn(),
    exists: jest.fn(),
    findOne: jest.fn()
};

const mockStreamModel = {
    findById: jest.fn(),
    exists: jest.fn(),
    find: jest.fn()
};

const mockCloudinaryUrl = jest.fn((publicId, options = {}) => {
    const extension = options.format ? `.${options.format}` : '';
    return `https://cloudinary.test/${options.resource_type || 'raw'}/${publicId}${extension}`;
});

const mockCloudinaryDestroy = jest.fn().mockResolvedValue({ result: 'ok' });

const noopMiddleware = (req, _res, next) => next();
const mockProfileUploadSingle = jest.fn(() => noopMiddleware);
const mockMaterialUploadArray = jest.fn(() => noopMiddleware);

jest.mock('../../models/Subject', () => mockSubjectModel);
jest.mock('../../models/Lesson', () => mockLessonModel);
jest.mock('../../models/Teacher', () => mockTeacherModel);
jest.mock('../../models/Stream', () => mockStreamModel);

jest.mock('cloudinary', () => ({
    v2: {
        config: jest.fn(),
        url: mockCloudinaryUrl,
        uploader: {
            destroy: mockCloudinaryDestroy
        }
    }
}), { virtual: true });

jest.mock('../../config/cloudinary', () => ({
    cloudinary: {
        uploader: {
            destroy: mockCloudinaryDestroy
        },
        url: mockCloudinaryUrl
    },
    profileUpload: {
        single: mockProfileUploadSingle
    },
    materialUpload: {
        array: mockMaterialUploadArray
    },
    uploadImage: {
        single: jest.fn(() => noopMiddleware)
    },
    uploadVideo: {
        single: jest.fn(() => noopMiddleware)
    },
    uploadThumbnail: {
        single: jest.fn(() => noopMiddleware)
    }
}));

const { app } = require('../../index');

describe('Course Management (My Courses) Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockCloudinaryUrl.mockImplementation((publicId, options = {}) => {
            const extension = options.format ? `.${options.format}` : '';
            return `https://cloudinary.test/${options.resource_type || 'raw'}/${publicId}${extension}`;
        });

        mockCloudinaryDestroy.mockResolvedValue({ result: 'ok' });
        mockProfileUploadSingle.mockImplementation(() => noopMiddleware);
        mockMaterialUploadArray.mockImplementation(() => noopMiddleware);
    });

    describe('GET /api/subjects', () => {
        test('should return 200 and all subjects', async () => {
            const subjects = [{ _id: 'sub-1', name: 'Physics' }];

            const sortMock = jest.fn().mockResolvedValue(subjects);
            const secondPopulate = jest.fn().mockReturnValue({ sort: sortMock });
            const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });

            mockSubjectModel.find.mockReturnValue({ populate: firstPopulate });

            const res = await request(app).get('/api/subjects');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ success: true, data: subjects });
        });

        test('should return 500 when subject query fails', async () => {
            mockSubjectModel.find.mockImplementation(() => {
                throw new Error('Subject query failed');
            });

            const res = await request(app).get('/api/subjects');

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({ success: false, error: 'Subject query failed' });
        });
    });

    describe('GET /api/subjects/:id', () => {
        test('should return 404 when subject does not exist', async () => {
            const secondPopulate = jest.fn().mockResolvedValue(null);
            const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
            mockSubjectModel.findById.mockReturnValue({ populate: firstPopulate });

            const res = await request(app).get('/api/subjects/missing-subject');

            expect(res.statusCode).toBe(404);
            expect(res.body).toEqual({ success: false, error: 'Subject not found' });
        });
    });

    describe('GET /api/subjects/:subjectId/lessons', () => {
        test('should return 200 and normalized lessons', async () => {
            const lessons = [
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

            const sortMock = jest.fn().mockResolvedValue(lessons);
            const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
            mockLessonModel.find.mockReturnValue({ populate: populateMock });

            const res = await request(app).get('/api/subjects/sub-1/lessons');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data[0].materials[0].url).toContain('materials/doc-1.pdf');
        });

        test('should return 500 when lessons query fails', async () => {
            mockLessonModel.find.mockImplementation(() => {
                throw new Error('Lesson query failed');
            });

            const res = await request(app).get('/api/subjects/sub-1/lessons');

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({ success: false, error: 'Lesson query failed' });
        });
    });
});
