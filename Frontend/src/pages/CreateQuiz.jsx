import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import { quizAPI } from '../services/api';

const CreateQuiz = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subject: '',
        timeLimit: 30,
        maxAttempts: 1,
        enrollmentKey: '',
        quizPassword: '',
        enrollmentStartTime: '',
        enrollmentEndTime: '',
        questions: []
    });
    const [currentQuestion, setCurrentQuestion] = useState({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: ''
    });
    const [loading, setLoading] = useState(false);

    const handleQuestionChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('option')) {
            const index = parseInt(name.split('-')[1]);
            const newOptions = [...currentQuestion.options];
            newOptions[index] = value;
            setCurrentQuestion({ ...currentQuestion, options: newOptions });
        } else {
            setCurrentQuestion({ ...currentQuestion, [name]: value });
        }
    };

    const addQuestion = () => {
        if (currentQuestion.question && currentQuestion.options.every(opt => opt.trim())) {
            setFormData({
                ...formData,
                questions: [...formData.questions, currentQuestion]
            });
            setCurrentQuestion({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' });
        } else {
            alert('Please fill all question fields');
        }
    };

    const removeQuestion = (index) => {
        setFormData({ ...formData, questions: formData.questions.filter((_, i) => i !== index) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.questions.length === 0) { alert('Please add at least one question'); return; }
        setLoading(true);
        try {
            // Convert datetime-local strings (local time, no tz) → UTC ISO so MongoDB
            // stores the time the teacher actually intended, not a UTC-shifted version.
            const payload = { ...formData };
            if (payload.enrollmentStartTime)
                payload.enrollmentStartTime = new Date(payload.enrollmentStartTime).toISOString();
            if (payload.enrollmentEndTime)
                payload.enrollmentEndTime = new Date(payload.enrollmentEndTime).toISOString();
            const data = await quizAPI.createQuiz(payload);
            if (data.success) { alert('Quiz created successfully!'); navigate('/teacher/view-quizzes'); }
            else { alert(data.error || 'Quiz creation failed'); }
        } catch (error) { alert('Quiz creation failed: ' + error.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-brand-50 to-gray-100">
            <Sidebar role="teacher" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="teacher" pageName="Create Quiz" />
                
                <PageHeader 
                    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    title="Create Quiz"
                    subtitle="Fill in the details and add questions to create a new quiz"
                />

                <div className="p-8">
                    <div className="max-w-4xl mx-auto relative z-10 -mt-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Quiz Details */}
                            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border border-gray-100">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-brand-700 to-brand-900 rounded-lg flex items-center justify-center text-white">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800">Quiz Details</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none transition-all" placeholder="Enter quiz title" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Subject <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <input type="text" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none transition-all" placeholder="Enter subject" required />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                    <div className="relative">
                                        <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                        </svg>
                                        <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none resize-y" rows="3" placeholder="Enter quiz description" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Time Limit (minutes)</label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <input type="number" value={formData.timeLimit} onChange={(e) => setFormData({...formData, timeLimit: parseInt(e.target.value)})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none" min="1" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Max Attempts <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <input type="number" value={formData.maxAttempts} onChange={(e) => setFormData({...formData, maxAttempts: parseInt(e.target.value) || 1})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none" min="1" required />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1.5">Number of times a student can attempt this quiz</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Enrollment Key <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </svg>
                                            <input type="text" value={formData.enrollmentKey} onChange={(e) => setFormData({...formData, enrollmentKey: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none" placeholder="e.g. QUIZ-2026-001" required />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Quiz Password <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <input type="text" value={formData.quizPassword} onChange={(e) => setFormData({...formData, quizPassword: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none" placeholder="Password for students" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Enrollment Start <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <input type="datetime-local" value={formData.enrollmentStartTime} onChange={(e) => setFormData({...formData, enrollmentStartTime: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Enrollment End <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <input type="datetime-local" value={formData.enrollmentEndTime} onChange={(e) => setFormData({...formData, enrollmentEndTime: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none" required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Add Question */}
                            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border border-gray-100">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-brand-700 rounded-lg flex items-center justify-center text-white">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800">Add Question</h2>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Question <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <input type="text" name="question" value={currentQuestion.question} onChange={handleQuestionChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none" placeholder="Enter the question" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentQuestion.options.map((option, index) => (
                                        <div key={index}>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Option {index + 1} <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">{String.fromCharCode(65 + index)}</span>
                                                <input type="text" name={`option-${index}`} value={option} onChange={handleQuestionChange} className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none" placeholder={`Option ${index + 1}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Correct Answer</label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <select name="correctAnswer" value={currentQuestion.correctAnswer} onChange={(e) => setCurrentQuestion({...currentQuestion, correctAnswer: parseInt(e.target.value)})} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none bg-white">
                                                {currentQuestion.options.map((_, index) => (
                                                    <option key={index} value={index}>Option {index + 1} ({String.fromCharCode(65 + index)})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Explanation (optional)</label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <input type="text" name="explanation" value={currentQuestion.explanation} onChange={handleQuestionChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none" placeholder="Why is this correct?" />
                                        </div>
                                    </div>
                                </div>
                                <button type="button" onClick={addQuestion} className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-brand-700 text-white rounded-xl hover:shadow-lg hover:from-green-600 hover:to-brand-900 transition-all font-semibold flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Question
                                </button>
                            </div>

                            {/* Questions List */}
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800">Questions ({formData.questions.length})</h2>
                                </div>
                                {formData.questions.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                        </svg>
                                        <p className="text-gray-500">No questions added yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {formData.questions.map((q, index) => (
                                            <div key={index} className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-800 flex items-center gap-2">
                                                            <span className="w-7 h-7 bg-gradient-to-br from-brand-700 to-brand-900 text-white rounded-lg flex items-center justify-center text-sm font-bold">{index + 1}</span>
                                                            {q.question}
                                                        </p>
                                                        <ul className="mt-3 space-y-1.5 pl-9">
                                                            {q.options.map((opt, i) => (
                                                                <li key={i} className={`text-sm flex items-center gap-2 ${i === q.correctAnswer ? 'text-brand-700 font-semibold' : 'text-gray-600'}`}>
                                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${i === q.correctAnswer ? 'bg-brand-50' : 'bg-gray-100'}`}>
                                                                        {i === q.correctAnswer ? '✓' : String.fromCharCode(65 + i)}
                                                                    </span>
                                                                    {opt}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <button type="button" onClick={() => removeQuestion(index)} className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={() => navigate('/teacher/dashboard')} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-brand-700 to-brand-900 text-white rounded-xl hover:shadow-xl hover:from-brand-900 hover:to-brand-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating Quiz...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Create Quiz
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateQuiz;
