const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({ generateContent: mockGenerateContent }));
const mockGoogleGenerativeAI = jest.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }));

const mockPdfParse = jest.fn();
const mockCloudinaryUpload = jest.fn();

const mockFsReadFileSync = jest.fn();
const mockFsExistsSync = jest.fn();
const mockFsUnlinkSync = jest.fn();

const mockQuizModel = {
    create: jest.fn()
};

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: mockGoogleGenerativeAI
}));

jest.mock('pdf-parse', () => mockPdfParse);

jest.mock('cloudinary', () => ({
    v2: {
        config: jest.fn(),
        uploader: {
            upload: mockCloudinaryUpload
        }
    }
}));

jest.mock('fs', () => ({
    readFileSync: mockFsReadFileSync,
    existsSync: mockFsExistsSync,
    unlinkSync: mockFsUnlinkSync
}));

jest.mock('../../models/Quiz', () => mockQuizModel);
jest.mock('../../models/User', () => ({}));

const { generateQuiz, saveQuizResult } = require('../../controllers/quizController');

const buildRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
});

describe('AI Quiz Generator Controller (Unit)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GEMINI_API_KEY = 'test-gemini-key';

        mockGoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: mockGetGenerativeModel
        }));

        mockGetGenerativeModel.mockImplementation(() => ({
            generateContent: mockGenerateContent
        }));

        mockFsReadFileSync.mockImplementation((_filePath, encoding) => {
            if (encoding === 'utf8') return 'Text file content';
            return Buffer.from('PDF binary');
        });

        mockFsExistsSync.mockReturnValue(true);
        mockPdfParse.mockResolvedValue({ text: 'Parsed PDF content' });
        mockCloudinaryUpload.mockResolvedValue({ secure_url: 'https://cdn.example.com/quiz-main.pdf' });
        mockQuizModel.create.mockResolvedValue({ _id: 'quiz-1' });
    });

    describe('generateQuiz', () => {
        test('returns 200 and generated quiz data on success', async () => {
            const req = {
                body: {
                    numQuestions: 2,
                    difficulty: 'Hard',
                    textInput: 'Human heart has four chambers.',
                    language: 'English',
                    selectedTypes: ['MCQ', 'TrueFalse']
                },
                files: [
                    {
                        path: 'uploads/heart-notes.pdf',
                        mimetype: 'application/pdf'
                    }
                ]
            };
            const res = buildRes();

            mockGenerateContent.mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        suggestedTimeLimitSeconds: 180,
                        quizTitle: 'Cardio Basics Quiz',
                        quiz: [
                            {
                                type: 'MCQ',
                                question: 'How many chambers are in the human heart?',
                                options: ['2', '3', '4', '5'],
                                correctAnswer: '4',
                                explanation: 'The heart has two atria and two ventricles.'
                            }
                        ]
                    })
                }
            });

            await generateQuiz(req, res);

            expect(mockGenerateContent).toHaveBeenCalledTimes(1);
            expect(mockCloudinaryUpload).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);

            const payload = res.json.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.quizTitle).toBe('Cardio Basics Quiz');
            expect(payload.timeLimitSeconds).toBe(180);
            expect(payload.pdfUrl).toBe('https://cdn.example.com/quiz-main.pdf');
            expect(Array.isArray(payload.data)).toBe(true);
            expect(payload.sourceContent).toContain('Parsed PDF content');
        });

        test('returns 400 when no text and no files are provided', async () => {
            const req = {
                body: {},
                files: []
            };
            const res = buildRes();

            await generateQuiz(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Please provide text or upload at least one document (PDF/TXT) to generate a quiz.'
            });
        });

        test('returns 500 when AI response is invalid JSON', async () => {
            const req = {
                body: {
                    textInput: 'Newton developed the three laws of motion.'
                },
                files: [
                    {
                        path: 'uploads/physics.pdf',
                        mimetype: 'application/pdf'
                    }
                ]
            };
            const res = buildRes();

            mockGenerateContent.mockResolvedValue({
                response: {
                    text: () => 'INVALID_JSON'
                }
            });

            await generateQuiz(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to parse AI response as JSON'
            });
        });
    });

    describe('saveQuizResult', () => {
        test('returns 201 when quiz result is saved', async () => {
            const req = {
                user: { id: 'student-1' },
                body: {
                    title: 'Cardio Basics Quiz',
                    score: 4,
                    totalQuestions: 5,
                    difficulty: 'Normal',
                    questions: [{ question: 'Q1', correctAnswer: 'A', userAnswer: 'A' }],
                    sourceContent: 'Heart notes',
                    pdfUrl: 'https://cdn.example.com/quiz-main.pdf'
                }
            };
            const res = buildRes();

            await saveQuizResult(req, res);

            expect(mockQuizModel.create).toHaveBeenCalledWith({
                student: 'student-1',
                title: 'Cardio Basics Quiz',
                score: 4,
                totalQuestions: 5,
                difficulty: 'Normal',
                questions: [{ question: 'Q1', correctAnswer: 'A', userAnswer: 'A' }],
                sourceContent: 'Heart notes',
                pdfUrl: 'https://cdn.example.com/quiz-main.pdf'
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Quiz result saved'
            });
        });

        test('returns 500 when saving quiz result fails', async () => {
            const req = {
                user: { id: 'student-1' },
                body: {
                    title: 'Fails to Save',
                    score: 0,
                    totalQuestions: 1,
                    difficulty: 'Easy',
                    questions: []
                }
            };
            const res = buildRes();

            mockQuizModel.create.mockRejectedValue(new Error('Database failure'));

            await saveQuizResult(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to save quiz result'
            });
        });
    });
});
