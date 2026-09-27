import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import { quizAPI } from '../services/api';
import CheatingAlert from '../components/CheatingAlert';

const QuizAttempts = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState([]);
    const [quizTitle, setQuizTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAttempts();
    }, [id]);

    const fetchAttempts = async () => {
        try {
            setLoading(true);
            // Fetch quiz details
            const quizData = await quizAPI.getQuiz(id);
            if (quizData.success) {
                setQuizTitle(quizData.data.title);
            }
            // Fetch attempts for this quiz
            const data = await quizAPI.getQuizAttempts(id);
            if (data.success) {
                setAttempts(data.data);
            } else {
                setError(data.error || 'Failed to load attempts');
            }
        } catch (err) {
            setError('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getScoreBadge = (pct) => {
        if (pct >= 80) return 'bg-green-100 text-green-700';
        if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
        return 'bg-red-100 text-red-700';
    };

    const getCheatingBadge = (count) => {
        if (!count || count === 0) return { bg: 'bg-green-100 text-green-700', label: 'Clean', icon: '✅' };
        if (count <= 2) return { bg: 'bg-yellow-100 text-yellow-700', label: 'Warning', icon: '⚠️' };
        return { bg: 'bg-red-100 text-red-700', label: 'Suspicious', icon: '🚨' };
    };

    const totalCheaters = attempts.filter(a => (a.tabSwitchCount || 0) > 0).length;

    return (
        <div className="flex min-h-screen bg-brand-50">
            <CheatingAlert />
            <Sidebar role="teacher" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="teacher" pageName="Quiz Attempts" />
                <PageHeader 
                    icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    title="Quiz Attempts"
                    subtitle={quizTitle ? `Results for: ${quizTitle}` : "Student performance and analytics"}
                >
                    <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-white/20 text-white rounded-xl shadow-md font-semibold hover:bg-white/30 transition-all whitespace-nowrap border border-white/30">
                        ← Back to Quizzes
                    </button>
                </PageHeader>
                <div className="p-8">
                    <div className="max-w-6xl mx-auto relative z-10 -mt-8">

                        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-700"></div>
                                <span className="ml-3 text-gray-500">Loading attempts...</span>
                            </div>
                        ) : attempts.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-md p-12 text-center">
                                <p className="text-5xl mb-4">📋</p>
                                <p className="text-gray-500 text-lg">No attempts yet for this quiz.</p>
                                <p className="text-gray-400 mt-1">Students haven't taken this quiz yet.</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary stats */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                        <p className="text-sm text-gray-500">Total Attempts</p>
                                        <p className="text-2xl font-bold text-gray-800">{attempts.length}</p>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                        <p className="text-sm text-gray-500">Average Final Score</p>
                                        <p className="text-2xl font-bold text-brand-700">
                                            {attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / attempts.length) : 0}%
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                        <p className="text-sm text-gray-500">Highest Final Score</p>
                                        <p className="text-2xl font-bold text-brand-700">
                                            {attempts.length > 0 ? Math.round(Math.max(...attempts.map(a => a.percentage ?? 0))) : 0}%
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                        <p className="text-sm text-gray-500">Pass Rate (≥50%)</p>
                                        <p className="text-2xl font-bold text-brand-700">
                                            {attempts.length > 0 ? Math.round(attempts.filter(a => (a.percentage ?? 0) >= 50).length / attempts.length * 100) : 0}%
                                        </p>
                                    </div>
                                    <div className={`rounded-xl shadow-sm p-4 border ${totalCheaters > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                                        <p className="text-sm text-gray-500">Tab Switches</p>
                                        <p className={`text-2xl font-bold ${totalCheaters > 0 ? 'text-red-600' : 'text-brand-700'}`}>
                                            {totalCheaters > 0 ? `${totalCheaters} 🚨` : '0 ✅'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">{totalCheaters > 0 ? 'students flagged' : 'no cheating detected'}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">#</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Student</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Score</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Tab Switches</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Marks Deducted</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Final Score</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Percentage</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attempts.map((attempt, index) => {
                                                const switches = attempt.tabSwitchCount || 0;
                                                const cheatInfo = getCheatingBadge(switches);
                                                return (
                                                    <tr key={attempt._id || index} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${switches > 2 ? 'bg-red-50/50' : ''}`}>
                                                        <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-medium text-gray-800">
                                                                {attempt.student?.firstName && attempt.student?.lastName
                                                                    ? `${attempt.student.firstName} ${attempt.student.lastName}`
                                                                    : attempt.student?.name || 'Unknown'}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                                            {attempt.score} / {attempt.totalQuestions}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center gap-1 text-sm font-bold ${switches > 0 ? 'text-red-600' : 'text-brand-700'}`}>
                                                                {switches > 0 ? `🚨 ${switches}` : '✅ 0'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${(attempt.tabSwitchDeduction || 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                                {(attempt.tabSwitchDeduction || 0) > 0 ? `−${attempt.tabSwitchDeduction}%` : '0'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-gray-800">
                                                            {Math.round(attempt.percentage ?? 0)}%
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getScoreBadge(Math.round(attempt.percentage ?? 0))}`}>
                                                                {Math.round(attempt.percentage ?? 0)}%
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cheatInfo.bg}`}>
                                                                {cheatInfo.icon} {cheatInfo.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {new Date(attempt.createdAt || attempt.completedAt).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizAttempts;
