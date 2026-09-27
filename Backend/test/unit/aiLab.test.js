const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({ generateContent: mockGenerateContent }));
const mockGoogleGenerativeAI = jest.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }));
const mockPdfParse = jest.fn();
const mockUploadStream = jest.fn();
const mockAISummarySave = jest.fn();

const mockAISummaryModel = jest.fn().mockImplementation(function AISummary(data) {
    Object.assign(this, data);
    this.save = mockAISummarySave;
});

mockAISummaryModel.find = jest.fn();
mockAISummaryModel.findOneAndDelete = jest.fn();
mockAISummaryModel.findOneAndUpdate = jest.fn();

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: mockGoogleGenerativeAI
}), { virtual: true });

jest.mock('pdf-parse', () => mockPdfParse, { virtual: true });

jest.mock('dotenv', () => ({
    config: jest.fn()
}), { virtual: true });

jest.mock('../../models/AISummary', () => mockAISummaryModel);

jest.mock('../../config/cloudinary', () => ({
    cloudinary: {
        uploader: {
            upload_stream: mockUploadStream
        }
    }
}));

const {
    summarizeText,
    saveSummary,
    getHistory,
    deleteHistoryItem,
    updateHistoryItem
} = require('../../controllers/aiController');

const buildRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
});

describe('AI Learning Lab Controller', () => {
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
    });

    afterAll(() => {
        process.env.GEMINI_API_KEY = originalApiKey;
    });

    describe('summarizeText', () => {
        test('returns 200 with formatted summary and related resources on success', async () => {
            const req = {
                body: {
                    text: 'Node.js is a JavaScript runtime.',
                    summaryType: 'qa'
                }
            };
            const res = buildRes();

            mockGenerateContent.mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        summary: [{ question: 'What is Node.js?', answer: 'A JavaScript runtime.' }],
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

            await summarizeText(req, res);

            expect(mockGoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
            expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                summary: 'Q: What is Node.js?\nA: A JavaScript runtime.',
                relatedResources: [
                    {
                        title: 'Node.js Docs',
                        link: 'https://nodejs.org/en/docs',
                        type: 'website'
                    }
                ]
            });
        });

        test('returns 400 when no text or files are provided', async () => {
            const req = { body: {} };
            const res = buildRes();

            await summarizeText(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Text or PDF file is required for summarization'
            });
        });

        test('returns 500 when GEMINI_API_KEY is missing', async () => {
            delete process.env.GEMINI_API_KEY;
            const req = { body: { text: 'Some content' } };
            const res = buildRes();

            await summarizeText(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Server configuration error: API Key missing'
            });
        });

        test('returns 500 when model generation fails', async () => {
            const req = { body: { text: 'Some content' } };
            const res = buildRes();

            mockGenerateContent.mockRejectedValue(new Error('AI service unavailable'));

            await summarizeText(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to summarize text',
                error: 'AI service unavailable'
            });
        });
    });

    describe('saveSummary', () => {
        test('returns 201 and saves a text summary successfully', async () => {
            const req = {
                body: {
                    title: 'My AI Summary',
                    summary: 'Short summary',
                    originalText: 'Original long text',
                    userId: 'user-1',
                    summaryType: 'paragraph',
                    relatedResources: JSON.stringify([
                        {
                            title: 'MDN',
                            link: 'https://developer.mozilla.org',
                            type: 'website'
                        }
                    ])
                }
            };
            const res = buildRes();

            mockAISummarySave.mockResolvedValue(undefined);

            await saveSummary(req, res);

            expect(mockAISummaryModel).toHaveBeenCalledWith(expect.objectContaining({
                user: 'user-1',
                title: 'My AI Summary',
                originalContent: 'Original long text',
                summary: 'Short summary',
                summaryType: 'paragraph',
                type: 'text'
            }));
            expect(mockAISummarySave).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalled();
        });

        test('returns 500 when save fails', async () => {
            const req = {
                body: {
                    title: 'Failing save',
                    summary: 'Summary',
                    originalText: 'Original text',
                    userId: 'user-1'
                }
            };
            const res = buildRes();

            mockAISummarySave.mockRejectedValue(new Error('Database write failed'));

            await saveSummary(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to save summary',
                error: 'Database write failed'
            });
        });
    });

    describe('getHistory', () => {
        test('returns 200 with user history on success', async () => {
            const req = { params: { userId: 'user-1' } };
            const res = buildRes();
            const history = [{ _id: 'h1', title: 'Summary 1' }];
            const sortMock = jest.fn().mockResolvedValue(history);

            mockAISummaryModel.find.mockReturnValue({ sort: sortMock });

            await getHistory(req, res);

            expect(mockAISummaryModel.find).toHaveBeenCalledWith({ user: 'user-1' });
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(history);
        });

        test('returns 500 when history query fails', async () => {
            const req = { params: { userId: 'user-1' } };
            const res = buildRes();

            mockAISummaryModel.find.mockImplementation(() => {
                throw new Error('Database read failed');
            });

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to fetch history',
                error: 'Database read failed'
            });
        });
    });

    describe('deleteHistoryItem', () => {
        test('returns 400 when userId is missing', async () => {
            const req = { params: { id: 'history-1' }, body: {} };
            const res = buildRes();

            await deleteHistoryItem(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'userId is required' });
        });

        test('returns 200 when history item is deleted', async () => {
            const req = { params: { id: 'history-1' }, body: { userId: 'user-1' } };
            const res = buildRes();

            mockAISummaryModel.findOneAndDelete.mockResolvedValue({ _id: 'history-1' });

            await deleteHistoryItem(req, res);

            expect(mockAISummaryModel.findOneAndDelete).toHaveBeenCalledWith({
                _id: 'history-1',
                user: 'user-1'
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'History item deleted successfully' });
        });

        test('returns 404 when history item does not exist', async () => {
            const req = { params: { id: 'missing-history' }, body: { userId: 'user-1' } };
            const res = buildRes();

            mockAISummaryModel.findOneAndDelete.mockResolvedValue(null);

            await deleteHistoryItem(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'History item not found' });
        });
    });

    describe('updateHistoryItem', () => {
        test('returns 200 and updated item on success', async () => {
            const req = {
                params: { id: 'history-1' },
                body: {
                    userId: 'user-1',
                    title: 'Updated title',
                    summary: 'Updated summary'
                }
            };
            const res = buildRes();

            const updatedDoc = { _id: 'history-1', title: 'Updated title', summary: 'Updated summary' };
            mockAISummaryModel.findOneAndUpdate.mockResolvedValue(updatedDoc);

            await updateHistoryItem(req, res);

            expect(mockAISummaryModel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: 'history-1', user: 'user-1' },
                { $set: { title: 'Updated title', summary: 'Updated summary' } },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(updatedDoc);
        });

        test('returns 500 when update fails', async () => {
            const req = {
                params: { id: 'history-1' },
                body: { userId: 'user-1', title: 'Updated title' }
            };
            const res = buildRes();

            mockAISummaryModel.findOneAndUpdate.mockRejectedValue(new Error('Update failed'));

            await updateHistoryItem(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Failed to update history item',
                error: 'Update failed'
            });
        });
    });
});
