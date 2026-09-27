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

describe('User Management Controller (Integration-Style)', () => {
    let usersById;
    let nextUserIndex;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'integration-jwt-secret';

        usersById = new Map();
        nextUserIndex = 1;

        mockJwtSign.mockReturnValue('integration-token');
        mockSendEmail.mockResolvedValue(undefined);

        mockUserModel.findOne.mockImplementation(async ({ email }) => {
            for (const user of usersById.values()) {
                if (user.email === email) return user;
            }
            return null;
        });

        mockUserModel.create.mockImplementation(async (userData) => {
            const createdUser = {
                ...userData,
                _id: `user-${nextUserIndex++}`,
                save: jest.fn().mockImplementation(async function save() {
                    usersById.set(createdUser._id, createdUser);
                    return createdUser;
                })
            };

            usersById.set(createdUser._id, createdUser);
            return createdUser;
        });

        mockUserModel.findById.mockImplementation(async (userId) => usersById.get(userId) || null);

        mockStudentModel.create.mockImplementation(async (studentData) => ({
            _id: `student-${studentData.user}`,
            ...studentData
        }));

        mockStudentModel.findOne.mockImplementation(async ({ user }) => ({
            _id: `student-${user}`,
            user,
            firstName: 'MockedFirstName'
        }));
    });

    test('registers a student then verifies OTP successfully', async () => {
        const registerReq = {
            body: {
                firstName: 'Nimal',
                lastName: 'Perera',
                email: 'nimal@example.com',
                password: 'securePass123'
            }
        };
        const registerRes = buildRes();

        await registerStudent(registerReq, registerRes);

        expect(registerRes.status).toHaveBeenCalledWith(201);
        const registerPayload = registerRes.json.mock.calls[0][0];
        expect(registerPayload.success).toBe(true);

        const createdUser = usersById.get(registerPayload.userId);
        expect(createdUser).toBeDefined();
        expect(createdUser.isVerified).toBe(false);
        expect(createdUser.otp).toHaveLength(6);

        const verifyReq = {
            body: {
                userId: registerPayload.userId,
                otp: createdUser.otp
            }
        };
        const verifyRes = buildRes();

        await verifyOTP(verifyReq, verifyRes);

        expect(verifyRes.status).toHaveBeenCalledWith(200);
        const verifyPayload = verifyRes.json.mock.calls[0][0];
        expect(verifyPayload.success).toBe(true);
        expect(verifyPayload.token).toBe('integration-token');

        const verifiedUser = usersById.get(registerPayload.userId);
        expect(verifiedUser.isVerified).toBe(true);
        expect(verifiedUser.otp).toBeUndefined();
        expect(verifiedUser.otpExpires).toBeUndefined();
    });

    test('returns 400 when trying to register with a duplicate email', async () => {
        const firstReq = {
            body: {
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'duplicate@example.com',
                password: 'password123'
            }
        };
        const firstRes = buildRes();

        await registerStudent(firstReq, firstRes);
        expect(firstRes.status).toHaveBeenCalledWith(201);

        const secondReq = {
            body: {
                firstName: 'Janet',
                lastName: 'Doe',
                email: 'duplicate@example.com',
                password: 'password456'
            }
        };
        const secondRes = buildRes();

        await registerStudent(secondReq, secondRes);

        expect(secondRes.status).toHaveBeenCalledWith(400);
        expect(secondRes.json).toHaveBeenCalledWith({
            success: false,
            error: 'User already exists'
        });
    });

    test('returns 400 when OTP is expired during verification', async () => {
        usersById.set('user-expired', {
            _id: 'user-expired',
            name: 'Expired OTP User',
            email: 'expired@example.com',
            role: 'student',
            isVerified: false,
            otp: '111111',
            otpExpires: Date.now() - 5_000,
            save: jest.fn().mockResolvedValue(undefined)
        });

        const req = {
            body: {
                userId: 'user-expired',
                otp: '111111'
            }
        };
        const res = buildRes();

        await verifyOTP(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Invalid or expired OTP'
        });
    });
});
