const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn()
};

const mockStudentModel = {
    create: jest.fn(),
    findOne: jest.fn()
};

const mockTeacherModel = {
    findOne: jest.fn()
};

const mockJwtSign = jest.fn();
const mockVerifyIdToken = jest.fn();

jest.mock('../../models/User', () => mockUserModel);
jest.mock('../../models/Student', () => mockStudentModel);
jest.mock('../../models/Teacher', () => mockTeacherModel);

jest.mock('jsonwebtoken', () => ({
    sign: mockJwtSign
}));

jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken
    }))
}));

const { googleLogin } = require('../../controllers/authController');

const buildRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
});

const buildPayload = (overrides = {}) => ({
    sub: 'google-sub-1',
    email: 'student@example.com',
    email_verified: true,
    name: 'Jane Student',
    given_name: 'Jane',
    family_name: 'Student',
    picture: 'https://example.com/pic.jpg',
    ...overrides
});

describe('googleLogin Controller (Unit)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'unit-test-secret';
        process.env.GOOGLE_CLIENT_ID = 'test-client-id';

        mockJwtSign.mockReturnValue('unit-signed-token');
    });

    test('returns 400 when credential is missing', async () => {
        const req = { body: {} };
        const res = buildRes();

        await googleLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Missing Google credential' });
        expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    test('returns 401 when the Google credential fails verification', async () => {
        const req = { body: { credential: 'bad-token' } };
        const res = buildRes();

        mockVerifyIdToken.mockRejectedValue(new Error('invalid token signature'));

        await googleLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid Google credential' });
    });

    test('returns 401 when Google reports the email as unverified', async () => {
        const req = { body: { credential: 'good-token' } };
        const res = buildRes();

        mockVerifyIdToken.mockResolvedValue({
            getPayload: () => buildPayload({ email_verified: false })
        });

        await googleLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Google email is not verified' });
        expect(mockUserModel.findOne).not.toHaveBeenCalled();
    });

    test('creates a new student user + profile on first Google sign-in', async () => {
        const req = { body: { credential: 'good-token' } };
        const res = buildRes();

        mockVerifyIdToken.mockResolvedValue({ getPayload: () => buildPayload() });
        mockUserModel.findOne.mockResolvedValue(null);

        const createdUser = {
            _id: 'user-new',
            name: 'Jane Student',
            email: 'student@example.com',
            role: 'student'
        };
        mockUserModel.create.mockResolvedValue(createdUser);
        mockStudentModel.create.mockResolvedValue({ _id: 'student-new' });
        mockStudentModel.findOne.mockResolvedValue({ _id: 'student-new', firstName: 'Jane' });

        await googleLogin(req, res);

        expect(mockUserModel.create).toHaveBeenCalledWith(expect.objectContaining({
            email: 'student@example.com',
            googleId: 'google-sub-1',
            authProvider: 'google',
            role: 'student',
            isVerified: true
        }));
        expect(mockStudentModel.create).toHaveBeenCalledWith(expect.objectContaining({
            user: 'user-new',
            firstName: 'Jane',
            lastName: 'Student'
        }));
        expect(res.status).toHaveBeenCalledWith(200);
        const payload = res.json.mock.calls[0][0];
        expect(payload.success).toBe(true);
        expect(payload.token).toBe('unit-signed-token');
        expect(payload.user.email).toBe('student@example.com');
    });

    test('logs into an existing account matched by googleId without creating a new one', async () => {
        const req = { body: { credential: 'good-token' } };
        const res = buildRes();

        mockVerifyIdToken.mockResolvedValue({ getPayload: () => buildPayload() });

        const existingUser = {
            _id: 'user-1',
            name: 'Jane Student',
            email: 'student@example.com',
            role: 'student',
            googleId: 'google-sub-1',
            isVerified: true,
            save: jest.fn().mockResolvedValue(undefined)
        };
        mockUserModel.findOne.mockResolvedValue(existingUser);
        mockStudentModel.findOne.mockResolvedValue({ _id: 'student-1', firstName: 'Jane' });

        await googleLogin(req, res);

        expect(mockUserModel.create).not.toHaveBeenCalled();
        expect(existingUser.save).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('links an existing local (password) account by email when it lacks a googleId', async () => {
        const req = { body: { credential: 'good-token' } };
        const res = buildRes();

        mockVerifyIdToken.mockResolvedValue({ getPayload: () => buildPayload() });

        const localUser = {
            _id: 'user-local',
            name: 'Jane Student',
            email: 'student@example.com',
            role: 'student',
            googleId: undefined,
            isVerified: false,
            save: jest.fn().mockResolvedValue(undefined)
        };
        mockUserModel.findOne.mockResolvedValue(localUser);
        mockStudentModel.findOne.mockResolvedValue({ _id: 'student-1', firstName: 'Jane' });

        await googleLogin(req, res);

        expect(localUser.googleId).toBe('google-sub-1');
        expect(localUser.isVerified).toBe(true);
        expect(localUser.save).toHaveBeenCalledTimes(1);
        expect(mockUserModel.create).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
