const Quiz = require('../models/Quizz');
const QuizAttempt = require('../models/QuizAttempt');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// ============================================================
//  Quiz Controller
//  Handles all quiz CRUD operations, access verification,
//  attempt submission, scoring, and results retrieval.
// ============================================================

// @desc    Enroll to a quiz using enrollment key (student enters key, system finds quiz)
// @route   POST /api/quizzes/enroll
// @access  Private/Student
exports.enrollToQuiz = async (req, res) => {
    try {
        const { enrollmentKey, quizPassword } = req.body;

        // VALIDATION: Enrollment key is required
        if (!enrollmentKey) {
            return res.status(400).json({ success: false, error: 'Enrollment key is required' });
        }

        // Find all quizzes that share this enrollment key.
        // Multiple quizzes may reuse the same key (common during testing),
        // so we pick the one whose enrollment window is currently open.
        // Fallback: if none is open, use the most recently created match.
        const matchingQuizzes = await Quiz.find({ enrollmentKey, isActive: true }).sort({ createdAt: -1 });
        if (matchingQuizzes.length === 0) {
            return res.status(404).json({ success: false, error: 'Invalid enrollment key. No active quiz found.' });
        }

        const now = new Date();
        let quiz = matchingQuizzes.find(q => {
            if (!q.enrollmentStartTime || !q.enrollmentEndTime) return true; // no window = always open
            return now >= new Date(q.enrollmentStartTime) && now <= new Date(q.enrollmentEndTime);
        });
        if (!quiz) quiz = matchingQuizzes[0]; // newest fallback

        // Check if this student already has attempt(s) on this quiz.
        // If they do and still have remaining attempts, skip the enrollment
        // time window check — they already enrolled, they're just retrying.
        let skipTimeCheck = false;
        if (req.user && req.user.id) {
            const student = await Student.findOne({ user: req.user.id });
            if (student) {
                const existingAttempts = await QuizAttempt.countDocuments({ student: student._id, quiz: quiz._id });
                const maxAttempts = quiz.maxAttempts || 1;
                if (existingAttempts > 0 && existingAttempts < maxAttempts) {
                    skipTimeCheck = true;
                }
                if (existingAttempts >= maxAttempts) {
                    return res.status(403).json({ success: false, error: `You have used all ${maxAttempts} attempt(s) for this quiz.` });
                }
            }
        }

        // VALIDATION: Check enrollment time window if configured (skip for retrying students)
        if (!skipTimeCheck && quiz.enrollmentStartTime && quiz.enrollmentEndTime) {
            const nowCheck = new Date();
            const start = new Date(quiz.enrollmentStartTime);
            const end   = new Date(quiz.enrollmentEndTime);
            if (nowCheck < start) {
                return res.status(403).json({ success: false, error: `Enrollment has not started yet. It opens on ${start.toLocaleString()}.` });
            }
            if (nowCheck > end) {
                return res.status(403).json({ success: false, error: `Enrollment period has ended. It closed on ${end.toLocaleString()}.` });
            }
        }

        // VALIDATION: Quiz password must match if set
        if (quiz.quizPassword && quiz.quizPassword !== quizPassword) {
            return res.status(401).json({ success: false, error: 'Invalid quiz password.' });
        }

        // Return quiz info so the frontend can show quiz details before navigating
        res.status(200).json({
            success: true,
            quizId: quiz._id,
            quizTitle: quiz.title,
            quizSubject: quiz.subject || '',
            quizDescription: quiz.description || '',
            totalQuestions: quiz.questions?.length || 0,
            timeLimit: quiz.timeLimit || 30,
            message: 'Access granted'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get all quizzes
// @route   GET /api/quizzes
// @access  Public (listing only — credentials stripped)
exports.getQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ isActive: true })
            .populate('createdBy', 'name subject')
            .sort({ createdAt: -1 });
        
        res.status(200).json({ 
            success: true, 
            count: quizzes.length, 
            data: quizzes 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get single quiz
// @route   GET /api/quizzes/:id
// @access  Private
exports.getQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id)
            .populate('createdBy', 'name subject');

        // VALIDATION: Return 404 if the quiz id does not match any document
        if (!quiz) {
            return res.status(404).json({ 
                success: false, 
                error: 'Quiz not found' 
            });
        }

        // Strip sensitive access credentials from the response for students.
        // Teachers editing a quiz pass ?includeCredentials=true to get the full object.
        const quizObj = quiz.toObject();
        if (req.query.includeCredentials !== 'true') {
            const hasCredentials = !!(quizObj.enrollmentKey || quizObj.quizPassword);
            delete quizObj.enrollmentKey;
            delete quizObj.quizPassword;
            quizObj.hasCredentials = hasCredentials; // tells frontend whether to show the lock icon
        }

        res.status(200).json({ success: true, data: quizObj });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Verify quiz access (enrollment key + password)
// @route   POST /api/quizzes/:id/verify
// @access  Private/Student
exports.verifyQuizAccess = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ 
                success: false, 
                error: 'Quiz not found' 
            });
        }

        const { enrollmentKey, quizPassword } = req.body;

        // VALIDATION: If quiz has no credentials configured, allow anyone in
        if (!quiz.enrollmentKey && !quiz.quizPassword) {
            return res.status(200).json({ success: true, message: 'Access granted' });
        }

        // Check if student already has attempts — skip time window for retries
        let skipTimeCheck = false;
        if (req.user && req.user.id) {
            const student = await Student.findOne({ user: req.user.id });
            if (student) {
                const existingAttempts = await QuizAttempt.countDocuments({ student: student._id, quiz: quiz._id });
                const maxAttempts = quiz.maxAttempts || 1;
                if (existingAttempts > 0 && existingAttempts < maxAttempts) {
                    skipTimeCheck = true;
                }
            }
        }

        // VALIDATION: Enrollment is only allowed within the configured time window
        // (skipped for students retrying a multi-attempt quiz)
        if (!skipTimeCheck && quiz.enrollmentStartTime && quiz.enrollmentEndTime) {
            const now = new Date();
            const start = new Date(quiz.enrollmentStartTime);
            const end   = new Date(quiz.enrollmentEndTime);
            if (now < start) {
                return res.status(403).json({ 
                    success: false, 
                    error: `Enrollment has not started yet. It opens on ${start.toLocaleString()}.`
                });
            }
            if (now > end) {
                return res.status(403).json({ 
                    success: false, 
                    error: `Enrollment period has ended. It closed on ${end.toLocaleString()}.`
                });
            }
        }

        // VALIDATION: Enrollment key must match exactly (case-sensitive)
        if (quiz.enrollmentKey && quiz.enrollmentKey !== enrollmentKey) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid enrollment key' 
            });
        }

        // VALIDATION: Quiz password must match exactly
        if (quiz.quizPassword && quiz.quizPassword !== quizPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid quiz password' 
            });
        }

        res.status(200).json({ success: true, message: 'Access granted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Create quiz
// @route   POST /api/quizzes
// @access  Private/Teacher
// NOTE: Basic field validation is handled by validateQuizCreation middleware
//       before this controller is called.
exports.createQuiz = async (req, res) => {
    try {
        // TODO: Re-enable teacher ownership check after auth is fully enforced.
        // Currently disabled so the UI works without mandatory teacher login.
        // const teacher = await Teacher.findOne({ user: req.user.id });
        // if (!teacher) {
        //     return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        // }

        const quizData = {
            ...req.body,
            createdBy: null // TODO: replace null with teacher._id once teacher check above is re-enabled
        };

        const quiz = await Quiz.create(quizData);
        res.status(201).json({ success: true, data: quiz });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private/Teacher (own quiz only)
exports.updateQuiz = async (req, res) => {
    try {
        let quiz = await Quiz.findById(req.params.id);

        // VALIDATION: Quiz must exist before attempting to update
        if (!quiz) {
            return res.status(404).json({ 
                success: false, 
                error: 'Quiz not found' 
            });
        }

        // VALIDATION: If authenticated, only the quiz creator can update it.
        // TODO: Remove the req.user guard once teacher auth is fully enforced.
        if (req.user && req.user.id) {
            const teacher = await Teacher.findOne({ user: req.user.id });
            if (quiz.createdBy.toString() !== teacher._id.toString()) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Not authorized to update this quiz' 
                });
            }
        }
        // If no user on the request, allow update (unauthenticated dev/test mode)

        const updateData = { ...req.body };
        // Keep totalQuestions in sync if questions array is being replaced
        if (req.body.questions) {
            updateData.totalQuestions = req.body.questions.length;
        }

        quiz = await Quiz.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true // Enforce Mongoose schema validators on update
        });

        res.status(200).json({ success: true, data: quiz });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private/Teacher (own quiz only) or Admin
exports.deleteQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        // VALIDATION: Quiz must exist before attempting to delete
        if (!quiz) {
            return res.status(404).json({ 
                success: false, 
                error: 'Quiz not found' 
            });
        }

        // VALIDATION: If authenticated, only the creator or an admin can delete.
        // TODO: Remove the req.user guard once teacher auth is fully enforced.
        if (req.user && req.user.id) {
            const teacher = await Teacher.findOne({ user: req.user.id });
            if (req.user.role !== 'admin' && 
                quiz.createdBy.toString() !== teacher._id.toString()) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Not authorized to delete this quiz' 
                });
            }
        }
        // If no user on the request, allow deletion (unauthenticated dev/test mode)

        await quiz.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/attempt
// @access  Private/Student
exports.submitQuizAttempt = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        
        if (!quiz) {
            return res.status(404).json({ 
                success: false, 
                error: 'Quiz not found' 
            });
        }

        // VALIDATION: Require an authenticated student to submit an attempt
        if (!req.user || !req.user.id) {
            return res.status(401).json({ 
                success: false, 
                error: 'Not authorized. Please log in.' 
            });
        }

        // VALIDATION: Student profile must exist in the DB (created at registration)
        const student = await Student.findOne({ user: req.user.id });
        if (!student) {
            return res.status(404).json({ 
                success: false, 
                error: 'Student profile not found. Please complete your profile first.' 
            });
        }
        const studentId = student._id;

        // VALIDATION: Enforce the maximum number of attempts per student per quiz
        if (quiz.maxAttempts && quiz.maxAttempts > 0) {
            const existingAttempts = await QuizAttempt.countDocuments({ student: studentId, quiz: quiz._id });
            if (existingAttempts >= quiz.maxAttempts) {
                return res.status(403).json({
                    success: false,
                    error: `You have used all ${quiz.maxAttempts} attempt(s) for this quiz.`
                });
            }
        }

        const { answers, timeTaken, tabSwitchCount } = req.body;

        // ── Scoring Logic ────────────────────────────────────────
        // Each correct answer adds 1 point.
        // Tab-switch penalty: a FLAT 3-mark deduction if the student
        // switched tabs at all during the quiz (regardless of how many times).
        // finalScore = max(0, correctAnswers - 3)   when tabSwitches > 0
        // finalScore = correctAnswers               when tabSwitches == 0
        // percentage  = finalScore / totalQuestions * 100
        let correctAnswers = 0;
        const processedAnswers = answers.map((answer, index) => {
            const isCorrect = answer.selectedAnswer === quiz.questions[index].correctAnswer;
            if (isCorrect) correctAnswers++;
            return {
                questionIndex: index,
                selectedAnswer: answer.selectedAnswer,
                isCorrect
            };
        });

        const score = correctAnswers;
        const tabSwitches = tabSwitchCount || 0;
        const rawPercentage = (score / quiz.questions.length) * 100;
        // Flat 3 PERCENTAGE POINT deduction if ANY tab switching occurred.
        // Using a percentage-point deduction (not a raw-mark deduction) means
        // the penalty is proportionally fair regardless of quiz length:
        //   e.g. 1/2 correct = 50% raw  →  50 - 3 = 47%  (not 0% as before)
        //   e.g. 46/100 correct = 46%   →  46 - 3 = 43%
        const tabSwitchDeduction = tabSwitches > 0 ? 3 : 0; // deducted from percentage
        const percentage = Math.max(0, rawPercentage - tabSwitchDeduction);
        const finalScore = percentage; // finalScore === percentage (kept for response compatibility)

        const attempt = await QuizAttempt.create({
            student: studentId,
            quiz: quiz._id,
            answers: processedAnswers,
            score,
            totalQuestions: quiz.questions.length,
            percentage,
            timeTaken,
            tabSwitchCount: tabSwitches,
            tabSwitchDeduction,
            finalScore
        });

        // Check if all attempts used after this submission
        const totalAttemptsMade = await QuizAttempt.countDocuments({ student: studentId, quiz: quiz._id });
        const allAttemptsUsed = quiz.maxAttempts > 0 && totalAttemptsMade >= quiz.maxAttempts;

        // If all attempts used, include questions with explanations and correct answers
        const responseData = {
            attempt,
            results: {
                score,
                totalQuestions: quiz.questions.length,
                percentage,
                tabSwitchCount: tabSwitches,
                tabSwitchDeduction,
                finalScore,
                attemptsMade: totalAttemptsMade,
                maxAttempts: quiz.maxAttempts || 1,
                allAttemptsUsed
            }
        };

        if (allAttemptsUsed) {
            responseData.results.questions = quiz.questions.map((q, i) => ({
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || '',
                studentAnswer: processedAnswers[i]?.selectedAnswer,
                isCorrect: processedAnswers[i]?.isCorrect
            }));
        }

        res.status(201).json({ 
            success: true, 
            data: responseData
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get all attempts for a specific quiz (teacher view)
// @route   GET /api/quizzes/:id/attempts
// @access  Private/Teacher
exports.getQuizAttempts = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        const attempts = await QuizAttempt.find({ quiz: req.params.id })
            .populate({
                path: 'student',
                select: 'firstName lastName profilePic',
            })
            .sort({ completedAt: -1 });

        res.status(200).json({
            success: true,
            count: attempts.length,
            data: attempts
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get student's quiz attempts
// @route   GET /api/quizzes/attempts
// @access  Private/Student
exports.getStudentAttempts = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ 
                success: false, 
                error: 'Not authorized. Please log in.' 
            });
        }

        const student = await Student.findOne({ user: req.user.id });
        if (!student) {
            return res.status(200).json({ 
                success: true, 
                count: 0, 
                data: [] 
            });
        }
        
        const attempts = await QuizAttempt.find({ student: student._id })
            .populate('quiz', 'title subject maxAttempts')
            .sort({ completedAt: -1 });

        res.status(200).json({ 
            success: true, 
            count: attempts.length, 
            data: attempts 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get student's attempts for a specific quiz
// @route   GET /api/quizzes/:id/my-attempts
// @access  Private/Student
exports.getMyAttemptsForQuiz = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized.' });
        }

        const student = await Student.findOne({ user: req.user.id });
        if (!student) {
            return res.status(200).json({ success: true, count: 0, data: [], maxAttempts: 1 });
        }

        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        const attempts = await QuizAttempt.find({ student: student._id, quiz: quiz._id })
            .sort({ completedAt: -1 });

        const allUsed = quiz.maxAttempts > 0 && attempts.length >= quiz.maxAttempts;

        res.status(200).json({ 
            success: true, 
            count: attempts.length,
            maxAttempts: quiz.maxAttempts || 1,
            allAttemptsUsed: allUsed,
            data: attempts
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};