const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../index');
const Quiz = require('../../models/Quizz');

// Simple mock-based integration test without MongoDB Memory Server
jest.mock('../../models/Quizz');

beforeAll(async () => {
    // No need for actual DB connection for integration tests
    process.env.NODE_ENV = 'test';
});

afterAll(async () => {
    // Clean up
    jest.clearAllMocks();
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Teacher Quiz Integration Tests', () => {

    describe('POST /api/quizzes', () => {
        it('should create a new quiz successfully', async () => {
            const quizPayload = {
                title: 'Integration Test Quiz',
                subject: 'Science',
                description: 'A test quiz created during integration testing',
                timeLimit: 15,
                maxAttempts: 2,
                questions: [
                    {
                        question: 'What is H2O?',
                        options: ['Water', 'Oxygen', 'Hydrogen', 'Carbon'],
                        correctAnswer: 0
                    }
                ]
            };

            const mockQuiz = {
                ...quizPayload,
                _id: 'mockQuizId123',
                totalQuestions: 1,
                createdBy: null
            };

            Quiz.create = jest.fn().mockResolvedValue(mockQuiz);

            const response = await request(app)
                .post('/api/quizzes')
                .send(quizPayload);

            // Assert Response
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(quizPayload.title);
        });

        it('should fail if required fields are missing', async () => {
            const invalidPayload = {
                description: 'No title or subject included'
            };

            const response = await request(app)
                .post('/api/quizzes')
                .send(invalidPayload);

            // Middleware validateQuizCreation typically stops it before controller.
            expect(response.status).not.toBe(201);
        });
    });

    describe('GET /api/quizzes', () => {
        it('should return a list of active quizzes', async () => {
            const mockQuizzes = [
                { title: 'Quiz 1', subject: 'Math', isActive: true, questions: [] },
                { title: 'Quiz 2', subject: 'History', isActive: true, questions: [] }
            ];

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockQuizzes)
            };

            Quiz.find = jest.fn().mockReturnValue(mockQuery);

            const response = await request(app).get('/api/quizzes');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Quiz.find).toHaveBeenCalledWith({ isActive: true });
        });
    });

    describe('PUT /api/quizzes/:id', () => {
        it('should update an existing quiz', async () => {
            const mockQuiz = {
                _id: '507f1f77bcf86cd799439011',
                title: 'Initial Title',
                subject: 'Math',
                questions: [],
                createdBy: null,
                toObject: function() { return this; }
            };

            const updatedQuiz = {
                ...mockQuiz,
                title: 'Updated Title'
            };

            Quiz.findById = jest.fn().mockResolvedValue(mockQuiz);
            Quiz.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedQuiz);

            const updatePayload = {
                title: 'Updated Title'
            };

            const response = await request(app)
                .put(`/api/quizzes/${mockQuiz._id}`)
                .send(updatePayload);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('Updated Title');
        });

        it('should return 404 for a non-existent quiz ID', async () => {
            const fakeId = '507f1f77bcf86cd799439012';
            
            Quiz.findById = jest.fn().mockResolvedValue(null);

            const response = await request(app)
                .put(`/api/quizzes/${fakeId}`)
                .send({ title: 'New' });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
});
