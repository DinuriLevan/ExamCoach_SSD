process.env.NODE_ENV = 'test';

const request = require('supertest');

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({ generateContent: mockGenerateContent }));
const mockGoogleGenerativeAI = jest.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }));
const mockPdfParse = jest.fn();
const mockAISummarySave = jest.fn();
const mockCloudinaryUploadStream = jest.fn();
const mockCloudinaryDestroy = jest.fn();
const mockCloudinaryUrl = jest.fn();

const noopMiddleware = (req, _res, next) => next();
const mockProfileUploadSingle = jest.fn(() => noopMiddleware);
const mockMaterialUploadArray = jest.fn(() => noopMiddleware);

const mockAISummaryModel = jest.fn().mockImplementation(function AISummary(data) {
    Object.assign(this, data);
    this.save = mockAISummarySave;
});

mockAISummaryModel.find = jest.fn();
mockAISummaryModel.findOneAndDelete = jest.fn();
mockAISummaryModel.findOneAndUpdate = jest.fn();

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: mockGoogleGenerativeAI
}));

jest.mock('pdf-parse', () => mockPdfParse);

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('../../models/AISummary', () => mockAISummaryModel);

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
            upload_stream: mockCloudinaryUploadStream,
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

describe('AI Learning Lab Integration Tests', () => {
    const originalApiKey = process.env.GEMINI_API_KEY;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GEMINI_API_KEY = 'test-api-key';

        mockGoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: mockGetGenerativeModel
        }));

        mockGetGenerativeModel.mockImplementation(() => ({
            generateContent: mockGenerateContent
        }));

        mockAISummaryModel.mockImplementation(function AISummary(data) {
            Object.assign(this, data);
            this.save = mockAISummarySave;
        });

        mockProfileUploadSingle.mockImplementation(() => noopMiddleware);
        mockMaterialUploadArray.mockImplementation(() => noopMiddleware);
    });

    afterAll(() => {
        process.env.GEMINI_API_KEY = originalApiKey;
    });

    describe('POST /api/ai/summarize', () => {
        test('should return 200 and summary for valid text', async () => {
            mockGenerateContent.mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        summary: 'Node.js summary',
                        relatedResources: [
                            {
                                title: 'Node.js Docs',
                                link: 'https://nodejs.org/en/docs',
                                type: 'website'
                            }
                        ]
                    })
                }
            });

            const res = await request(app)
                .post('/api/ai/summarize')
                .send({ text: 'Node.js is a runtime.' });

            expect(res.statusCode).toBe(200);
            expect(res.body.summary).toBe('Node.js summary');
            expect(res.body.relatedResources).toHaveLength(1);
        });

        test('should return 400 when text is missing', async () => {
            const res = await request(app)
                .post('/api/ai/summarize')
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({ message: 'Text or PDF file is required for summarization' });
        });

        test('should return 500 when AI provider fails', async () => {
            mockGenerateContent.mockRejectedValue(new Error('AI service unavailable'));

            const res = await request(app)
                .post('/api/ai/summarize')
                .send({ text: 'Trigger failure' });

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: 'Failed to summarize text',
                error: 'AI service unavailable'
            });
        });
    });

    describe('POST /api/ai/save', () => {
        test('should return 201 when summary is saved', async () => {
            mockAISummarySave.mockResolvedValue(undefined);

            const payload = {
                title: 'Saved Summary',
                summary: 'Short summary',
                originalText: 'Original text body',
                userId: 'user-1',
                summaryType: 'paragraph'
            };

            const res = await request(app)
                .post('/api/ai/save')
                .send(payload);

            expect(res.statusCode).toBe(201);
            expect(res.body.title).toBe('Saved Summary');
            expect(res.body.summary).toBe('Short summary');
        });

        test('should return 500 when save operation fails', async () => {
            mockAISummarySave.mockRejectedValue(new Error('Database write failed'));

            const res = await request(app)
                .post('/api/ai/save')
                .send({
                    title: 'Failing save',
                    summary: 'Summary',
                    originalText: 'Original text',
                    userId: 'user-1'
                });

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: 'Failed to save summary',
                error: 'Database write failed'
            });
        });
    });

    describe('GET /api/ai/history/:userId', () => {
        test('should return 200 and history list', async () => {
            const history = [{ _id: 'h1', title: 'Summary 1' }];
            const sortMock = jest.fn().mockResolvedValue(history);
            mockAISummaryModel.find.mockReturnValue({ sort: sortMock });

            const res = await request(app).get('/api/ai/history/user-1');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(history);
        });

        test('should return 500 when history fetch fails', async () => {
            mockAISummaryModel.find.mockImplementation(() => {
                throw new Error('Database read failed');
            });

            const res = await request(app).get('/api/ai/history/user-1');

            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({
                message: 'Failed to fetch history',
                error: 'Database read failed'
            });
        });
    });
});
