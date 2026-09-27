const { createQuiz, updateQuiz } = require('../../controllers/quizzController');
const Quiz = require('../../models/Quizz');

// Mock the Quiz model
jest.mock('../../models/Quizz');

describe('Teacher Quiz Controller (Unit)', () => {
    let req;
    let res;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Setup common request and response objects
        req = {
            body: {
                title: 'Test Quiz',
                subject: 'Math',
                questions: [
                    { question: '1+1?', options: ['1', '2', '3'], correctAnswer: 1 }
                ]
            },
            params: {
                id: '123456789012'
            },
            user: {
                id: 'teacher123'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('createQuiz', () => {
        it('should successfully create a quiz and return 201', async () => {
            // Arrange
            const mockQuizData = { ...req.body, createdBy: null, _id: 'newQuizId' };
            Quiz.create.mockResolvedValue(mockQuizData);

            // Act
            await createQuiz(req, res);

            // Assert
            expect(Quiz.create).toHaveBeenCalledWith({
                ...req.body,
                createdBy: null
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockQuizData
            });
        });

        it('should return 500 if database creation fails', async () => {
            // Arrange
            const errorMessage = 'Database error';
            Quiz.create.mockRejectedValue(new Error(errorMessage));

            // Act
            await createQuiz(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: errorMessage
            });
        });
    });

    describe('updateQuiz', () => {
        it('should successfully update a quiz', async () => {
            // Arrange
            // Since req.user is set, updateQuiz will look for teacher. Disable user for simpler unit test
            req.user = null; // simulate unauthenticated or dev mode
            
            const existingQuiz = { _id: '123456789012', title: 'Old Title' };
            Quiz.findById.mockResolvedValue(existingQuiz);
            
            const updatedQuiz = { ...existingQuiz, title: 'Updated Title' };
            Quiz.findByIdAndUpdate.mockResolvedValue(updatedQuiz);

            // Act
            req.body.title = 'Updated Title';
            await updateQuiz(req, res);

            // Assert
            expect(Quiz.findById).toHaveBeenCalledWith('123456789012');
            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith(
                '123456789012',
                expect.objectContaining({ title: 'Updated Title' }),
                { new: true, runValidators: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: updatedQuiz
            });
        });

        it('should return 404 if quiz does not exist', async () => {
            // Arrange
            Quiz.findById.mockResolvedValue(null);

            // Act
            await updateQuiz(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Quiz not found'
            });
        });
    });
});
