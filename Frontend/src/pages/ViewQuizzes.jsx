import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import { quizAPI } from '../services/api';
import CheatingAlert from '../components/CheatingAlert';

const ViewQuizzes = () => {
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

    const handleUpdateQuiz = (quizId) => { navigate(`/teacher/update-quiz/${quizId}`); };

    const handleDeleteQuiz = async (quizId) => {
        if (window.confirm('Are you sure you want to delete this quiz?')) {
            try {
                await quizAPI.deleteQuiz(quizId);
                setQuizzes(quizzes.filter(q => q._id !== quizId));
            } catch (err) { alert('Delete failed: ' + err.message); }
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-brand-50 to-gray-100">
            <CheatingAlert />
            <Sidebar role="teacher" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="teacher" pageName="View Quizzes" />
                
                <PageHeader 
                    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    title="Available Quizzes"
                    subtitle="Browse and manage all your quizzes"
                >
                    <button onClick={() => navigate('/teacher/create-quiz')} className="px-6 py-2.5 bg-white text-brand-800 rounded-xl font-semibold hover:bg-brand-50 shadow-md transition-all whitespace-nowrap flex items-center gap-2">
                        + Create New Quiz
                    </button>
                </PageHeader>

                <div className="p-8">
                    <div className="max-w-7xl mx-auto relative z-10 -mt-8">
                        {loading && (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-700 mr-4"></div>
                                <span className="text-gray-500">Loading quizzes...</span>
                            </div>
                        )}
                        
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {!loading && quizzes.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 text-lg font-medium">No quizzes available yet.</p>
                                <p className="text-gray-400 text-sm mt-2 mb-6">Create your first quiz to get started</p>
                                <button onClick={() => navigate('/teacher/create-quiz')} className="px-6 py-3 bg-gradient-to-r from-brand-700 to-brand-900 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2 mx-auto">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create Your First Quiz
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {quizzes.map((quiz) => (
                                    <div key={quiz._id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 flex flex-col transform hover:-translate-y-1">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-brand-700 to-brand-900 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <span className="text-xs font-semibold px-3 py-1 bg-brand-50 text-brand-700 rounded-full border border-brand-50">
                                                {quiz.subject}
                                            </span>
                                        </div>
                                        
                                        <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-brand-700 transition-colors">{quiz.title}</h3>
                                        <p className="text-gray-500 text-sm mb-4 flex-1 line-clamp-2">{quiz.description || 'No description available'}</p>
                                        
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                {quiz.totalQuestions} Questions
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {quiz.timeLimit} mins
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                {quiz.maxAttempts || 1} Attempt{(quiz.maxAttempts || 1) > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        
                                        <p className="text-xs text-gray-400 mb-4 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Created: {new Date(quiz.createdAt).toLocaleDateString()}
                                        </p>
                                        
                                        <div className="flex gap-2 mt-auto">
                                            <button onClick={() => navigate(`/teacher/quiz-attempts/${quiz._id}`)} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-700 to-green-600 text-white rounded-xl hover:shadow-md hover:from-brand-700 hover:to-green-700 transition-all text-sm font-semibold flex items-center justify-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                Results
                                            </button>
                                            <button onClick={() => handleUpdateQuiz(quiz._id)} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-700 to-brand-900 text-white rounded-xl hover:shadow-md hover:from-brand-700 hover:to-brand-900 transition-all text-sm font-semibold flex items-center justify-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Update
                                            </button>
                                            <button onClick={() => handleDeleteQuiz(quiz._id)} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all text-sm font-semibold flex items-center justify-center border border-red-100">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewQuizzes;
