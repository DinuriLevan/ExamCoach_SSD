import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { quizAPI } from '../services/api';
import StudentNavbar from '../components/StudentNavbar';
import io from 'socket.io-client';

const SOCKET_URL = 'https://examcoach-backend-mnoy.onrender.com';

const TakeQuiz = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const socketRef = useRef(null);

    // If ?verified=true was passed from the enrollment popup in StudentQuizzes,
    // skip the credential screen and go straight to the quiz warning / quiz.
    const preVerified = searchParams.get('verified') === 'true';

    const [quizData, setQuizData] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [tabWarning, setTabWarning] = useState(false);

    const [showQuizWarning, setShowQuizWarning] = useState(false);
    const [rulesAgreed, setRulesAgreed] = useState(false);

    // Access verification state
    const [accessGranted, setAccessGranted] = useState(false);
    const [enrollmentKey, setEnrollmentKey] = useState('');
    const [quizPassword, setQuizPassword] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [quizMeta, setQuizMeta] = useState(null); // basic quiz info before access

    // Connect to socket for cheating detection (only after access granted)
    useEffect(() => {
        if (!accessGranted) return;

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Student connected to socket:', socket.id);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            socket.emit('join-quiz', {
                quizId: id,
                studentName: user.name || 'Unknown Student',
                studentId: user.id || user._id,
                role: 'student'
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [id, accessGranted]);

    // Tab switch / visibility change detection
    useEffect(() => {
        if (submitted || !quizData) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitchCount(prev => {
                    const newCount = prev + 1;

                    // Notify teacher via socket
                    if (socketRef.current) {
                        const user = JSON.parse(localStorage.getItem('user') || '{}');
                        socketRef.current.emit('tab-switch', {
                            quizId: id,
                            quizTitle: quizData.title,
                            studentName: user.name || 'Unknown Student',
                            studentId: user.id || user._id,
                            switchCount: newCount,
                            timestamp: new Date().toISOString()
                        });
                    }

                    return newCount;
                });

                // Play warning beep sound using Web Audio API
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    // First beep
                    const osc1 = audioCtx.createOscillator();
                    const gain1 = audioCtx.createGain();
                    osc1.type = 'square';
                    osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
                    gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                    osc1.connect(gain1);
                    gain1.connect(audioCtx.destination);
                    osc1.start(audioCtx.currentTime);
                    osc1.stop(audioCtx.currentTime + 0.3);
                    // Second beep (higher pitch, slight delay)
                    const osc2 = audioCtx.createOscillator();
                    const gain2 = audioCtx.createGain();
                    osc2.type = 'square';
                    osc2.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.35);
                    gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.35);
                    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.65);
                    osc2.connect(gain2);
                    gain2.connect(audioCtx.destination);
                    osc2.start(audioCtx.currentTime + 0.35);
                    osc2.stop(audioCtx.currentTime + 0.65);
                    // Clean up after sounds finish
                    setTimeout(() => audioCtx.close(), 1000);
                } catch (e) {
                    console.warn('Could not play beep sound:', e);
                }

                // Show warning to student
                setTabWarning(true);
                setTimeout(() => setTabWarning(false), 5000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [id, quizData, submitted]);

    // Fetch quiz metadata first (to show title before credential check)
    useEffect(() => {
        const fetchQuizMeta = async () => {
            try {
                setLoading(true);
                const data = await quizAPI.getQuiz(id);
                if (data.success) {
                    setQuizMeta(data.data);

                    // If student already verified via the popup in StudentQuizzes,
                    // grant access immediately and load quiz data.
                    if (preVerified) {
                        setAccessGranted(true);
                        setShowQuizWarning(true);
                        setQuizData(data.data);
                        setAnswers(new Array(data.data.questions.length).fill(null));
                        const minutes = data.data.timeLimit || 30;
                        setTimeLeft(minutes * 60);
                    }
                } else {
                    setError(data.error || 'Failed to load quiz');
                }
            } catch (err) {
                setError('Error loading quiz: ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchQuizMeta();
    }, [id, preVerified]);

    // Handle credential verification
    const handleVerifyAccess = async (e) => {
        e.preventDefault();
        setVerifyError('');
        setVerifying(true);
        try {
            const data = await quizAPI.verifyQuizAccess(id, {
                enrollmentKey,
                quizPassword
            });
            if (data.success) {
                setAccessGranted(true);
                setShowQuizWarning(true);
                // Now load full quiz data
                const quizRes = await quizAPI.getQuiz(id);
                if (quizRes.success) {
                    setQuizData(quizRes.data);
                    setAnswers(new Array(quizRes.data.questions.length).fill(null));
                    const minutes = quizRes.data.timeLimit || 30;
                    setTimeLeft(minutes * 60);
                }
            } else {
                setVerifyError(data.error || 'Access denied');
            }
        } catch (err) {
            setVerifyError(err.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    // Submit handler — format answers as {selectedAnswer} objects for backend
    const handleSubmit = useCallback(async () => {
        if (submitted) return;
        setSubmitted(true);
        try {
            const formattedAnswers = answers.map(a => ({ selectedAnswer: a }));
            const data = await quizAPI.submitQuizAttempt(id, {
                answers: formattedAnswers,
                tabSwitchCount
            });
            if (data.success) {
                setResult(data.data.results || data.data);
            } else {
                setError(data.error || 'Submission failed');
                setSubmitted(false);
            }
        } catch (err) {
            setError('Error submitting quiz: ' + err.message);
            setSubmitted(false);
        }
    }, [id, answers, submitted, tabSwitchCount]);

    // Timer countdown
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submitted) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, submitted, handleSubmit]);

    const formatTime = (seconds) => {
        if (seconds === null || isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (questionIndex, optionIndex) => {
        const updated = [...answers];
        updated[questionIndex] = optionIndex;
        setAnswers(updated);
    };

    const getTimerColor = () => {
        if (timeLeft === null) return 'text-gray-600';
        if (timeLeft <= 60) return 'text-red-600 animate-pulse';
        if (timeLeft <= 300) return 'text-orange-500';
        return 'text-brand-700';
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-brand-50">
                <StudentNavbar />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading quiz...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state (no quiz loaded)
    if (error && !quizData && !quizMeta) {
        return (
            <div className="min-h-screen bg-brand-50">
                <StudentNavbar />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="bg-red-50 text-red-700 p-6 rounded-xl max-w-md text-center">
                        <p className="font-semibold text-lg mb-2">Error</p>
                        <p>{error}</p>
                        <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Go Back</button>
                    </div>
                </div>
            </div>
        );
    }

    // Credential verification screen (shown before quiz starts)
    if (!accessGranted && quizMeta) {
        return (
            <div className="min-h-screen bg-brand-50">
                <StudentNavbar />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-50 rounded-full mb-4">
                                <span className="text-3xl">🔐</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">{quizMeta.title}</h2>
                            <p className="text-gray-500 mt-1">{quizMeta.subject}</p>
                            <div className="flex justify-center gap-4 mt-3 text-sm text-gray-500">
                                <span>📝 {quizMeta.questions?.length || 0} Questions</span>
                                <span>⏱️ {quizMeta.timeLimit || 30} mins</span>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                            <p className="text-sm text-yellow-800 font-medium text-center">
                                🔑 Enter the enrollment key and password provided by your teacher to access this quiz.
                            </p>
                        </div>

                        {verifyError && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm text-center">
                                {verifyError}
                            </div>
                        )}

                        <form onSubmit={handleVerifyAccess} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Key</label>
                                <input
                                    type="text"
                                    value={enrollmentKey}
                                    onChange={(e) => setEnrollmentKey(e.target.value)}
                                    placeholder="Enter enrollment key"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Password</label>
                                <input
                                    type="password"
                                    value={quizPassword}
                                    onChange={(e) => setQuizPassword(e.target.value)}
                                    placeholder="Enter quiz password"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none transition-colors"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    ← Go Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={verifying}
                                    className="flex-1 px-4 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-900 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {verifying ? 'Verifying...' : 'Start Quiz →'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Rules & quiz info screen (shown after enrollment, before quiz starts)
    if (showQuizWarning && quizData) {
        return (
            <div className="min-h-screen bg-brand-50">
                <StudentNavbar />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full mx-4">
                        {/* Quiz Info */}
                        <div className="text-center mb-5">
                            <h2 className="text-2xl font-bold text-gray-800">{quizData.title}</h2>
                            <p className="text-brand-700 font-medium mt-1">{quizData.subject}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-400 uppercase font-semibold">Questions</p>
                                <p className="text-lg font-bold text-gray-800">{quizData.questions?.length || 0}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-400 uppercase font-semibold">Time Limit</p>
                                <p className="text-lg font-bold text-gray-800">{quizData.timeLimit || 30} min</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-400 uppercase font-semibold">Attempts</p>
                                <p className="text-lg font-bold text-gray-800">{quizData.maxAttempts || 1}</p>
                            </div>
                        </div>
                        {quizData.description && (
                            <div className="bg-brand-50 border border-brand-300 rounded-lg p-3 mb-5 text-sm text-brand-900">
                                <span className="font-semibold">Description:</span> {quizData.description}
                            </div>
                        )}

                        {/* Rules */}
                        <div className="border-t border-gray-200 pt-5">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">⚠️</span>
                                <h3 className="text-lg font-bold text-gray-800">Quiz Rules</h3>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                                <p className="text-red-800 font-semibold text-center leading-relaxed">
                                    Switching tabs during the quiz will result in a <span className="underline">3% deduction</span> from your score.
                                </p>
                            </div>
                            <ul className="text-sm text-gray-600 space-y-2 mb-5">
                                <li className="flex items-start gap-2"><span>🔴</span> Tab switching = <strong>flat −3%</strong> penalty on your score</li>
                                <li className="flex items-start gap-2"><span>🔴</span> Your teacher will be notified of every tab switch</li>
                                <li className="flex items-start gap-2"><span>🔴</span> Stay focused on this tab throughout the quiz</li>
                                <li className="flex items-start gap-2"><span>🔴</span> The timer starts once you click the button below</li>
                            </ul>

                            <label className="flex items-center gap-3 mb-5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rulesAgreed}
                                    onChange={(e) => setRulesAgreed(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-brand-700 focus:ring-brand-700"
                                />
                                <span className="text-sm text-gray-700 font-medium">I have read and agree to the quiz rules</span>
                            </label>

                            <button
                                onClick={() => setShowQuizWarning(false)}
                                disabled={!rulesAgreed}
                                className="w-full px-6 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-900 transition-colors font-medium text-lg disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Continue to Quiz →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Results view
    if (result) {
        const rawPercentage = Math.round((result.score / result.totalQuestions) * 100);
        const deduction = result.tabSwitchDeduction || 0;
        // result.percentage already has the deduction applied (done on the backend)
        const finalPercentage = Math.round(result.percentage ?? rawPercentage);
        const passed = finalPercentage >= 50;
        const allAttemptsUsed = result.allAttemptsUsed;
        return (
            <div className="min-h-screen bg-brand-50">
                <StudentNavbar />
                <div className="max-w-3xl mx-auto p-8 mt-8">

                    {/* Quiz Info Card */}
                    <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-3">{quizData.title}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400 uppercase text-xs font-semibold mb-1">Subject</p>
                                <p className="text-gray-700 font-medium">{quizData.subject || '—'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 uppercase text-xs font-semibold mb-1">Questions</p>
                                <p className="text-gray-700 font-medium">{quizData.questions?.length || result.totalQuestions}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 uppercase text-xs font-semibold mb-1">Time Limit</p>
                                <p className="text-gray-700 font-medium">{quizData.timeLimit || 30} mins</p>
                            </div>
                            <div>
                                <p className="text-gray-400 uppercase text-xs font-semibold mb-1">Teacher</p>
                                <p className="text-gray-700 font-medium">{quizData.createdBy?.name || '—'}</p>
                            </div>
                        </div>
                        {quizData.description && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-gray-400 uppercase text-xs font-semibold mb-1">Description</p>
                                <p className="text-gray-600 text-sm">{quizData.description}</p>
                            </div>
                        )}
                        {(quizData.enrollmentStartTime || quizData.enrollmentEndTime) && (
                            <div className="mt-3">
                                <p className="text-gray-400 uppercase text-xs font-semibold mb-1">Enrollment Window</p>
                                <p className="text-gray-600 text-sm">
                                    {quizData.enrollmentStartTime ? new Date(quizData.enrollmentStartTime).toLocaleString() : 'Open'}
                                    {' → '}
                                    {quizData.enrollmentEndTime ? new Date(quizData.enrollmentEndTime).toLocaleString() : 'Open'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Score Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
                            <span className="text-4xl">{passed ? '🎉' : '📝'}</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed!</h2>

                        <div className={`text-6xl font-extrabold mb-2 ${passed ? 'text-brand-700' : 'text-red-600'}`}>
                            {finalPercentage}%
                        </div>
                        <p className="text-gray-600 mb-2">
                            You answered <span className="font-bold">{result.score}</span> out of <span className="font-bold">{result.totalQuestions}</span> correctly
                            <span className="text-gray-400 text-sm ml-1">({rawPercentage}% raw)</span>
                        </p>
                        {deduction > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                                <p className="text-red-700 text-sm font-medium">
                                    🚨 Tab switch detected ({tabSwitchCount} time{tabSwitchCount !== 1 ? 's' : ''}) — <span className="font-bold">−{deduction}% penalty applied</span>
                                </p>
                                <p className="text-red-800 text-xs mt-1 opacity-75">
                                    {rawPercentage}% − {deduction}% = <strong>{finalPercentage}%</strong> final score
                                </p>
                            </div>
                        )}
                        {result.attemptsMade && (
                            <p className="text-gray-500 text-sm mb-2">
                                Attempt {result.attemptsMade} of {result.maxAttempts}
                            </p>
                        )}

                        {!allAttemptsUsed && (
                            <div className="bg-brand-50 border border-brand-300 rounded-lg p-3 mb-4">
                                <p className="text-sm text-brand-900">
                                    You have <span className="font-bold">{result.maxAttempts - result.attemptsMade}</span> attempt(s) remaining. Explanations will be shown after your final attempt.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center mt-6">
                            <button onClick={() => navigate('/student/quizzes')} className="px-6 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-900 transition-colors font-medium">
                                View All Quizzes
                            </button>
                            <button onClick={() => navigate('/student/home')} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                                Go to Dashboard
                            </button>
                        </div>
                    </div>

                    {/* Explanations section — shown only after all attempts used */}
                    {allAttemptsUsed && result.questions && (
                        <div className="mt-8">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                📖 Answer Explanations
                            </h3>
                            <div className="space-y-4">
                                {result.questions.map((q, index) => (
                                    <div key={index} className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${q.isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h4 className="font-semibold text-gray-800">
                                                <span className="text-brand-700 mr-2">Q{index + 1}.</span>
                                                {q.question}
                                            </h4>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${q.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {q.isCorrect ? '✓ Correct' : '✗ Wrong'}
                                            </span>
                                        </div>
                                        <div className="space-y-2 mb-3">
                                            {q.options.map((opt, oi) => (
                                                <div key={oi} className={`px-3 py-2 rounded-lg text-sm ${
                                                    oi === q.correctAnswer
                                                        ? 'bg-green-50 text-green-800 font-medium border border-green-200'
                                                        : oi === q.studentAnswer && !q.isCorrect
                                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                                        : 'bg-gray-50 text-gray-600'
                                                }`}>
                                                    <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>
                                                    {opt}
                                                    {oi === q.correctAnswer && <span className="ml-2 text-brand-700">✓</span>}
                                                    {oi === q.studentAnswer && oi !== q.correctAnswer && <span className="ml-2 text-red-500">(Your answer)</span>}
                                                </div>
                                            ))}
                                        </div>
                                        {q.explanation && (
                                            <div className="bg-brand-50 border border-brand-300 rounded-lg p-3">
                                                <p className="text-sm text-brand-900">
                                                    <span className="font-semibold">💡 Explanation:</span> {q.explanation}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Quiz view
    const question = quizData?.questions?.[currentQuestion];
    const totalQuestions = quizData?.questions?.length || 0;
    const answeredCount = answers.filter(a => a !== null).length;

    return (
        <div className="min-h-screen bg-brand-50">
            <StudentNavbar />
            <div className="max-w-4xl mx-auto p-6 mt-4">
                {/* Tab switch warning */}
                {tabWarning && (
                    <div className="bg-red-600 text-white p-4 rounded-xl mb-4 flex items-center gap-3 animate-pulse shadow-lg">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <p className="font-bold">Warning: Tab Switch Detected!</p>
                            <p className="text-sm opacity-90">Your teacher has been notified. Switching tabs during an exam is considered cheating. (Count: {tabSwitchCount})</p>
                        </div>
                    </div>
                )}

                {/* Header bar */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{quizData?.title}</h1>
                        <p className="text-sm text-gray-500">{quizData?.subject}</p>
                    </div>
                    <div className="flex items-center gap-6">
                        {tabSwitchCount > 0 && (
                            <div className="text-right">
                                <p className="text-xs text-red-500 uppercase tracking-wider font-bold">⚠️ Switches</p>
                                <p className="text-lg font-bold text-red-600">{tabSwitchCount}</p>
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Time Left</p>
                            <p className={`text-2xl font-mono font-bold ${getTimerColor()}`}>
                                {formatTime(timeLeft)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Progress</p>
                            <p className="text-lg font-semibold text-gray-700">{answeredCount}/{totalQuestions}</p>
                        </div>
                    </div>
                </div>

                {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

                {/* Question card — uses question.question (matching the Quiz model field) */}
                {question && (
                    <div className="bg-white rounded-xl shadow-md p-8 mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="bg-brand-700 text-white text-sm font-bold px-3 py-1 rounded-full">
                                Q{currentQuestion + 1}
                            </span>
                            <span className="text-gray-400 text-sm">of {totalQuestions}</span>
                        </div>

                        <h2 className="text-xl font-semibold text-gray-800 mb-6">{question.question}</h2>

                        <div className="space-y-3">
                            {question.options?.map((option, idx) => {
                                const isSelected = answers[currentQuestion] === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(currentQuestion, idx)}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                                            isSelected
                                                ? 'border-brand-700 bg-brand-50 text-brand-900 shadow-sm'
                                                : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 text-gray-700'
                                        }`}
                                    >
                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mr-3 ${
                                            isSelected ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                        disabled={currentQuestion === 0}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        ← Previous
                    </button>

                    <div className="flex gap-1.5 flex-wrap justify-center max-w-md">
                        {Array.from({ length: totalQuestions }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentQuestion(i)}
                                className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                                    i === currentQuestion
                                        ? 'bg-brand-700 text-white scale-110'
                                        : answers[i] !== null
                                        ? 'bg-brand-700 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    {currentQuestion < totalQuestions - 1 ? (
                        <button
                            onClick={() => setCurrentQuestion(currentQuestion + 1)}
                            className="px-6 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-900 transition-colors font-medium"
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitted}
                            className="px-6 py-3 bg-brand-900 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {submitted ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                    )}
                </div>

                {/* Question overview legend */}
                <div className="mt-6 bg-white rounded-xl shadow-md p-4">
                    <p className="text-sm text-gray-500 mb-2 font-medium">Question Overview</p>
                    <div className="flex gap-1 items-center text-xs text-gray-500">
                        <span className="w-3 h-3 bg-brand-700 rounded-full inline-block"></span> Answered
                        <span className="ml-3 w-3 h-3 bg-gray-200 rounded-full inline-block"></span> Unanswered
                        <span className="ml-3 w-3 h-3 bg-brand-700 rounded-full inline-block"></span> Current
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TakeQuiz;
