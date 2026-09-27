import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import CheatingAlert from '../components/CheatingAlert';
import { quizAPI } from '../services/api';

// Convert a UTC ISO string → local-time string accepted by <input type="datetime-local">
// e.g. "2026-02-25T06:00:00.000Z" in UTC+5:30  →  "2026-02-25T11:30"
const toLocalInputValue = (utcString) => {
    if (!utcString) return '';
    const d = new Date(utcString);
    // Offset moves the clock from UTC to local time before slicing
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const UpdateQuiz = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        examCategory: '',
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Fetch existing quiz data
    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const data = await quizAPI.getQuizFull(id);
                if (data.success) {
                    const quiz = data.data;
                    setFormData({
                        examCategory: quiz.examCategory || '',
                        title: quiz.title || '',
                        description: quiz.description || '',
                        subject: quiz.subject || '',
                        timeLimit: quiz.timeLimit || 30,
                        maxAttempts: quiz.maxAttempts || 1,
                        enrollmentKey: quiz.enrollmentKey || '',
                        quizPassword: quiz.quizPassword || '',
                        enrollmentStartTime: toLocalInputValue(quiz.enrollmentStartTime),
                        enrollmentEndTime: toLocalInputValue(quiz.enrollmentEndTime),
                        questions: quiz.questions || []
                    });
                } else {
                    setError(data.error || 'Failed to load quiz');
                }
            } catch (err) {
                setError('Error loading quiz: ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [id]);

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
            setFormData({ ...formData, questions: [...formData.questions, currentQuestion] });
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
        setSaving(true);
        setError('');
        try {
            // Convert datetime-local strings (local time, no timezone) to proper UTC ISO strings
            // so MongoDB always receives unambiguous timestamps.
            const payload = { ...formData };
            if (payload.enrollmentStartTime)
                payload.enrollmentStartTime = new Date(payload.enrollmentStartTime).toISOString();
            if (payload.enrollmentEndTime)
                payload.enrollmentEndTime = new Date(payload.enrollmentEndTime).toISOString();

            const data = await quizAPI.updateQuiz(id, payload);
            if (data.success) {
                alert('Quiz updated successfully!');
                navigate('/teacher/view-quizzes');
            } else {
                setError(data.error || 'Failed to update quiz');
            }
        } catch (err) {
            setError('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-brand-50">
                <Sidebar role="teacher" />
                <div className="flex-1 ml-64">
                    <TopNavbar role="teacher" pageName="Update Quiz" />
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-700"></div>
                        <span className="ml-3 text-gray-500">Loading quiz...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-brand-50">
            <CheatingAlert />
            <Sidebar role="teacher" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="teacher" pageName="Update Quiz" />
                <PageHeader 
                    icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    title="Update Quiz"
                    subtitle="Edit quiz details and questions"
                >
                    <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-white/20 text-white rounded-xl shadow-md font-semibold hover:bg-white/30 transition-all whitespace-nowrap border border-white/30">
                        ← Back to Quizzes
                    </button>
                </PageHeader>
                <div className="p-8">
                    <div className="max-w-4xl mx-auto relative z-10 -mt-8">

                        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

                        <form onSubmit={handleSubmit}>
                            {/* Quiz details */}
                            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">Quiz Details</h2>

                                {/* Exam Category */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Exam Category <span className="text-red-500">*</span></label>
                                    <div className="flex gap-3">
                                        {['AL', 'OL'].map((cat) => (
                                            <button key={cat} type="button"
                                                onClick={() => setFormData({...formData, examCategory: cat})}
                                                className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                                                    formData.examCategory === cat
                                                        ? 'border-brand-700 bg-brand-700 text-white shadow-md'
                                                        : 'border-gray-300 text-gray-500 hover:border-brand-300 hover:text-brand-700'
                                                }`}>
                                                {cat === 'AL' ? 'A/L — Advanced Level' : 'O/L — Ordinary Level'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                        <input type="text" required value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows="2" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                        <input type="text" required value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
                                        <input type="number" min="1" value={formData.timeLimit}
                                            onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 30 })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
                                        <input type="number" min="1" value={formData.maxAttempts}
                                            onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                        <p className="text-xs text-gray-400 mt-1">Number of times a student can attempt this quiz</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Key</label>
                                        <input type="text" value={formData.enrollmentKey}
                                            onChange={(e) => setFormData({ ...formData, enrollmentKey: e.target.value })}
                                            placeholder="e.g. QUIZ-2026-001"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Password</label>
                                        <input type="text" value={formData.quizPassword}
                                            onChange={(e) => setFormData({ ...formData, quizPassword: e.target.value })}
                                            placeholder="Password for students"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Start</label>
                                        <input type="datetime-local" value={formData.enrollmentStartTime}
                                            onChange={(e) => setFormData({ ...formData, enrollmentStartTime: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment End</label>
                                        <input type="datetime-local" value={formData.enrollmentEndTime}
                                            onChange={(e) => setFormData({ ...formData, enrollmentEndTime: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Existing questions */}
                            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                                    Questions ({formData.questions.length})
                                </h2>
                                {formData.questions.length === 0 ? (
                                    <p className="text-gray-400 text-center py-4">No questions yet</p>
                                ) : (
                                    <div className="space-y-3">
                                        {formData.questions.map((q, i) => (
                                            <div key={i} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">
                                                        <span className="text-brand-700 font-bold mr-2">Q{i + 1}.</span>
                                                        {q.question}
                                                    </p>
                                                    <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-gray-600">
                                                        {q.options.map((opt, oi) => (
                                                            <span key={oi} className={oi === q.correctAnswer ? 'text-green-700 font-medium' : ''}>
                                                                {String.fromCharCode(65 + oi)}. {opt} {oi === q.correctAnswer && '✓'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => removeQuestion(i)}
                                                    className="ml-3 text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add new question */}
                            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Question</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                                        <input type="text" name="question" value={currentQuestion.question}
                                            onChange={handleQuestionChange}
                                            placeholder="Enter your question"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {currentQuestion.options.map((opt, i) => (
                                            <div key={i}>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Option {String.fromCharCode(65 + i)}</label>
                                                <input type="text" name={`option-${i}`} value={opt}
                                                    onChange={handleQuestionChange}
                                                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                                            <select name="correctAnswer" value={currentQuestion.correctAnswer}
                                                onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none">
                                                {currentQuestion.options.map((_, i) => (
                                                    <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (optional)</label>
                                            <input type="text" name="explanation" value={currentQuestion.explanation}
                                                onChange={handleQuestionChange}
                                                placeholder="Why is this correct?"
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none" />
                                        </div>
                                    </div>
                                    <button type="button" onClick={addQuestion}
                                        className="px-6 py-2 bg-brand-900 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                                        + Add Question
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex gap-4">
                                <button type="submit" disabled={saving}
                                    className="px-8 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-900 transition-colors font-medium shadow-md disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button type="button" onClick={() => navigate('/teacher/view-quizzes')}
                                    className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateQuiz;
