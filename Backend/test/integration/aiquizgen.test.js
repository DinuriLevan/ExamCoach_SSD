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

describe('AI Quiz Generator Controller (Integration-Style)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GEMINI_API_KEY = 'integration-test-key';

        mockGoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: mockGetGenerativeModel
        }));

        mockGetGenerativeModel.mockImplementation(() => ({
            generateContent: mockGenerateContent
        }));

        mockFsReadFileSync.mockImplementation((_filePath, encoding) => {
            if (encoding === 'utf8') return 'Plain text file content';
            return Buffer.from('PDF bytes');
        });

        mockFsExistsSync.mockReturnValue(true);
        mockPdfParse.mockResolvedValue({ text: 'Parsed PDF notes for quiz generation' });
        mockCloudinaryUpload.mockResolvedValue({ secure_url: 'https://cdn.example.com/generated-quiz.pdf' });
        mockQuizModel.create.mockResolvedValue({ _id: 'saved-quiz-id' });
    });

    test('handles generate + save flow successfully', async () => {
        const generateReq = {
            body: {
                numQuestions: 3,
                difficulty: 'Normal',
                textInput: 'SQL uses SELECT, INSERT, UPDATE, and DELETE.',
                language: 'English',
                selectedTypes: ['MCQ', 'ShortAnswer']
            },
            files: [
                {
                    path: 'uploads/sql-guide.pdf',
                    mimetype: 'application/pdf'
                },
                {
                    path: 'uploads/sql-glossary.txt',
                    mimetype: 'text/plain'
                }
            ]
        };
        const generateRes = buildRes();

        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => JSON.stringify({
                    suggestedTimeLimitSeconds: 240,
                    quizTitle: 'SQL Fundamentals Quiz',
                    quiz: [
                        {
                            type: 'MCQ',
                            question: 'Which SQL command retrieves data?',
                            options: ['SELECT', 'UPDATE', 'DROP', 'MERGE'],
                            correctAnswer: 'SELECT',
                            explanation: 'SELECT is used to read data.'
                        },
                        {
                            type: 'ShortAnswer',
                            question: 'Name one SQL DML statement.',
                            correctAnswer: 'INSERT',
                            explanation: 'INSERT adds records.'
                        }
                    ]
                })
            }
        });

        await generateQuiz(generateReq, generateRes);

        expect(generateRes.status).toHaveBeenCalledWith(200);
        const generatedPayload = generateRes.json.mock.calls[0][0];
        expect(generatedPayload.success).toBe(true);
        expect(generatedPayload.quizTitle).toBe('SQL Fundamentals Quiz');
        expect(generatedPayload.data).toHaveLength(2);

        const saveReq = {
            user: { id: 'student-22' },
            body: {
                title: generatedPayload.quizTitle,
                score: 2,
                totalQuestions: generatedPayload.data.length,
                difficulty: 'Normal',
                questions: generatedPayload.data.map((question) => ({
                    ...question,
                    userAnswer: question.correctAnswer,
                    obtainedMarks: 1
                })),
                sourceContent: generatedPayload.sourceContent,
                pdfUrl: generatedPayload.pdfUrl
            }
        };
        const saveRes = buildRes();

        await saveQuizResult(saveReq, saveRes);

        expect(mockQuizModel.create).toHaveBeenCalledWith(expect.objectContaining({
            student: 'student-22',
            title: 'SQL Fundamentals Quiz',
            totalQuestions: 2,
            difficulty: 'Normal'
        }));
        expect(saveRes.status).toHaveBeenCalledWith(201);
        expect(saveRes.json).toHaveBeenCalledWith({
            success: true,
            message: 'Quiz result saved'
        });
    });

    test('returns 500 when AI model generation throws', async () => {
        const req = {
            body: {
                textInput: 'Computer networks basics'
            },
            files: [
                {
                    path: 'uploads/network.pdf',
                    mimetype: 'application/pdf'
                }
            ]
        };
        const res = buildRes();

        mockGenerateContent.mockRejectedValue(new Error('AI service unavailable'));

        await generateQuiz(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'AI service unavailable'
        });
    });

    test('returns 500 when quiz persistence fails', async () => {
        const req = {
            user: { id: 'student-7' },
            body: {
                title: 'DB Failure Case',
                score: 1,
                totalQuestions: 3,
                difficulty: 'Easy',
                questions: []
            }
        };
        const res = buildRes();

        mockQuizModel.create.mockRejectedValue(new Error('Write failed'));

        await saveQuizResult(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Failed to save quiz result'
        });
    });
});
