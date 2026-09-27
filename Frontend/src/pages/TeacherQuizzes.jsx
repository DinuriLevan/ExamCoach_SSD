import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import { quizAPI } from '../services/api';
import CheatingAlert from '../components/CheatingAlert';

const TeacherQuizzes = () => {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { fetchQuizzes(); }, []);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const data = await quizAPI.getQuizzes();
            if (data.success) { setQuizzes(data.data); }
            else { setError(data.error || 'Failed to load quizzes'); }
        } catch (err) { setError('Error: ' + err.message); }
        finally { setLoading(false); }
    };

    const handleDelete = async (quizId) => {
        if (!window.confirm('Are you sure you want to delete this quiz?')) return;
        try {
            await quizAPI.deleteQuiz(quizId);
            setQuizzes(quizzes.filter(q => q._id !== quizId));
        } catch (err) { alert('Delete failed: ' + err.message); }
    };

    return (
        <div className="flex min-h-screen bg-brand-50">
            <CheatingAlert />
            <Sidebar role="teacher" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="teacher" pageName="My Quizzes" />
                
                <PageHeader 
                    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    title="My Quizzes"
                    subtitle="Manage all your created quizzes"
                >
                    <button onClick={() => navigate('/teacher/create-quiz')} className="px-6 py-2.5 bg-white text-brand-800 rounded-xl font-semibold hover:bg-brand-50 shadow-md transition-all whitespace-nowrap">
                        + Create Quiz
                    </button>
                </PageHeader>

                <div className="p-8">
                    <div className="max-w-7xl mx-auto relative z-10 -mt-8">

                        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-700"></div>
                                <span className="ml-3 text-gray-500">Loading quizzes...</span>
                            </div>
                        ) : quizzes.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-md p-12 text-center">
                                <p className="text-5xl mb-4">📝</p>
                                <p className="text-gray-500 text-lg">You haven't created any quizzes yet.</p>
                                <button onClick={() => navigate('/teacher/create-quiz')} className="mt-4 px-6 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-900">
                                    Create Your First Quiz
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">#</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Title</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Subject</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Questions</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Time Limit</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Enrollment</th>
                                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Created</th>
                                            <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quizzes.map((quiz, index) => (
                                            <tr key={quiz._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-gray-800">{quiz.title}</p>
                                                    {quiz.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{quiz.description}</p>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-brand-700 font-medium">{quiz.subject}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{quiz.totalQuestions || quiz.questions?.length || 0}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{quiz.timeLimit || 30} mins</td>
                                                <td className="px-6 py-4">
                                                    {quiz.enrollmentKey ? (
                                                        <span className="text-xs bg-brand-50 text-brand-900 px-2 py-1 rounded-full font-medium">🔑 Key Required</span>
                                                    ) : (
                                                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">Open</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(quiz.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => navigate(`/teacher/quiz-attempts/${quiz._id}`)}
                                                            className="px-3 py-1.5 bg-brand-50 text-brand-900 rounded-lg text-xs font-medium hover:bg-brand-50 transition-colors"
                                                        >
                                                            View Attempts
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(quiz._id)}
                                                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherQuizzes;
