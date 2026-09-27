const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn()
};

const mockStudentModel = {
    create: jest.fn(),
    findOne: jest.fn()
};

const mockTeacherModel = {
    findOne: jest.fn()
};

const mockJwtSign = jest.fn();
const mockSendEmail = jest.fn();

jest.mock('../../models/User', () => mockUserModel);
jest.mock('../../models/Student', () => mockStudentModel);
jest.mock('../../models/Teacher', () => mockTeacherModel);

jest.mock('jsonwebtoken', () => ({
    sign: mockJwtSign
}));

jest.mock('../../utils/sendEmail', () => mockSendEmail);

jest.mock('../../utils/emailTemplates', () => ({
    getOTPVerificationTemplate: jest.fn((otp) => `OTP:${otp}`),
    getPasswordResetTemplate: jest.fn((url) => `RESET:${url}`),
    getWelcomeTemplate: jest.fn((name) => `WELCOME:${name}`)
}));

const { registerStudent, verifyOTP } = require('../../controllers/authController');

const buildRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
});

describe('User Management Controller (Unit)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'unit-test-secret';

        mockJwtSign.mockReturnValue('unit-signed-token');
        mockSendEmail.mockResolvedValue(undefined);
    });

    describe('registerStudent', () => {
        test('returns 201 when registration succeeds', async () => {
            const req = {
                body: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'password123'
                }
            };
            const res = buildRes();

            mockUserModel.findOne.mockResolvedValue(null);
            mockUserModel.create.mockResolvedValue({
                _id: 'user-1',
                name: 'John Doe',
                email: 'john@example.com'
            });
            mockStudentModel.create.mockResolvedValue({ _id: 'student-1' });

            await registerStudent(req, res);

            expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
            expect(mockUserModel.create).toHaveBeenCalledWith(expect.objectContaining({
                name: 'John Doe',
                email: 'john@example.com',
                role: 'student',
                isVerified: false,
                otp: expect.any(String),
                otpExpires: expect.any(Number)
            }));
            expect(mockStudentModel.create).toHaveBeenCalledWith({
                user: 'user-1',
                firstName: 'John',
                lastName: 'Doe',
                profilePic: 'default-profile.png'
            });
            expect(mockSendEmail).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Registration successful. Please verify your email.',
                userId: 'user-1'
            });
        });

        test('returns 400 when email already exists', async () => {
            const req = {
                body: {
                    firstName: 'Jane',
                    lastName: 'Doe',
                    email: 'jane@example.com',
                    password: 'password123'
                }
            };
            const res = buildRes();

            mockUserModel.findOne.mockResolvedValue({ _id: 'existing-user' });

            await registerStudent(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, error: 'User already exists' });
        });

        test('returns 500 when OTP email fails to send', async () => {
            const req = {
                body: {
                    firstName: 'Alex',
                    lastName: 'Smith',
                    email: 'alex@example.com',
                    password: 'password123'
                }
            };
            const res = buildRes();

            mockUserModel.findOne.mockResolvedValue(null);
            mockUserModel.create.mockResolvedValue({
                _id: 'user-2',
                name: 'Alex Smith',
                email: 'alex@example.com'
            });
            mockStudentModel.create.mockResolvedValue({ _id: 'student-2' });
            mockSendEmail.mockRejectedValue(new Error('SMTP error'));

            await registerStudent(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Email could not be sent'
            });
        });
    });

    describe('verifyOTP', () => {
        test('returns 200 and token when OTP is valid', async () => {
            const req = {
                body: {
                    userId: 'user-1',
                    otp: '123456'
                }
            };
            const res = buildRes();

            const user = {
                _id: 'user-1',
                name: 'John Doe',
                email: 'john@example.com',
                role: 'student',
                isVerified: false,
                otp: '123456',
                otpExpires: Date.now() + 60_000,
                save: jest.fn().mockResolvedValue(undefined)
            };

            mockUserModel.findById.mockResolvedValue(user);
            mockStudentModel.findOne.mockResolvedValue({ _id: 'student-1', user: 'user-1', firstName: 'John' });

            await verifyOTP(req, res);

            expect(user.save).toHaveBeenCalledTimes(1);
            expect(mockJwtSign).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);

            const payload = res.json.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.token).toBe('unit-signed-token');
            expect(payload.user.email).toBe('john@example.com');
            expect(payload.user.profile).toEqual(expect.objectContaining({ firstName: 'John' }));
        });

        test('returns 400 when userId or OTP is missing', async () => {
            const req = { body: {} };
            const res = buildRes();

            await verifyOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Please provide user ID and OTP'
            });
        });

        test('returns 404 when user is not found', async () => {
            const req = {
                body: {
                    userId: 'missing-user',
                    otp: '123456'
                }
            };
            const res = buildRes();

            mockUserModel.findById.mockResolvedValue(null);

            await verifyOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'User not found'
            });
        });

        test('returns 400 when OTP is invalid or expired', async () => {
            const req = {
                body: {
                    userId: 'user-1',
                    otp: '999999'
                }
            };
            const res = buildRes();

            mockUserModel.findById.mockResolvedValue({
                _id: 'user-1',
                isVerified: false,
                otp: '123456',
                otpExpires: Date.now() + 60_000
            });

            await verifyOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid or expired OTP'
            });
        });
    });
});
