import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import StudentLayout from '../layouts/StudentLayout';
import PageHeader from '../components/PageHeader';
import GoogleCalendarConnect from '../components/GoogleCalendarConnect';

const StudyPlanResult = () => {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [todayProgress, setTodayProgress] = useState(null);
    const [studyHours, setStudyHours] = useState(0);
    const [studyMinutes, setStudyMinutes] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        fetchPlan();
        fetchTodayProgress();
    }, []);

    const fetchPlan = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setPlan(data.data);
            } else {
                // If no plan, redirect to create
                if (response.status === 404) {
                    navigate('/student/create-plan');
                } else {
                    setError('Failed to load study plan');
                }
            }
        } catch (err) {
            setError('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmMessage = 'Are you sure you want to delete your study plan?\n\n' +
            'This will:\n' +
            '• Remove all exam dates from your Google Calendar\n' +
            '• Delete all your study notes and journal entries\n' +
            '• Clear your timetable and progress\n\n' +
            'This action cannot be undone.';
        
        if (!window.confirm(confirmMessage)) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                navigate('/student/create-plan');
            } else {
                alert('Failed to delete plan');
            }
        } catch (err) {
            alert('Error deleting plan');
        }
    };

    const fetchTodayProgress = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan/today-progress', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setTodayProgress(data.data);
            }
        } catch (error) {
            console.error('Error fetching progress:', error);
        }
    };

    const handleLogTime = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan/log-time', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ hours: studyHours, minutes: studyMinutes })
            });

            const data = await response.json();
            if (data.success) {
                // Refresh progress
                fetchTodayProgress();
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error logging time:', error);
        }
    };

    const handleEditTime = () => {
        if (todayProgress?.todayLog) {
            setStudyHours(todayProgress.todayLog.hoursStudied);
            setStudyMinutes(todayProgress.todayLog.minutesStudied);
        }
        setIsEditing(true);
    };

    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
        if (hours > 0) return `${hours} hr`;
        return `${mins} min`;
    };

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex justify-center items-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
                </div>
            </StudentLayout>
        );
    }

    if (error) {
        return (
            <StudentLayout>
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md">
                    {error}
                </div>
            </StudentLayout>
        );
    }

    if (!plan) return null;

    return (
        <StudentLayout
            header={
                <PageHeader
                    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    title="Your Personalized Study Plan"
                    subtitle="AI-generated plan based on your subjects and exam dates"
                >
                    <Link
                        to="/student/create-plan"
                        state={{ plan }}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all"
                    >
                        Edit Plan
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white font-semibold rounded-xl transition-all"
                    >
                        Delete Plan
                    </button>
                </PageHeader>
            }
        >
            <div>
                {/* Next Exam Warning Box */}
                {plan.daysUntilNextExam !== undefined && (
                    <div className="mb-8 bg-red-50 border-l-4 border-red-500 rounded-lg p-6 shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-red-800 mb-1">
                                    ⚠️ Upcoming Exam Alert
                                </h3>
                                <p className="text-red-700 text-base">
                                    Next exam in <span className="font-bold text-xl">{plan.daysUntilNextExam}</span> {plan.daysUntilNextExam === 1 ? 'day' : 'days'}!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Google Calendar Integration */}
                <GoogleCalendarConnect studentId={user?.profile?._id} studyPlanId={plan?._id} />

                {/* Daily Schedule and Stats - Moved to Top */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Stats Cards */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Daily Goal</h3>
                            <p className="text-4xl font-bold text-brand-700">{plan.studyHoursPerDay} <span className="text-lg text-gray-400 font-normal">hours</span></p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">My Subjects</h3>
                            <div className="flex flex-col gap-2">
                                {plan.subjects.map((sub, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sub.isWeak
                                            ? 'bg-red-100 text-red-800 border border-red-200'
                                            : 'bg-brand-50 text-brand-900 border border-green-200'
                                            }`}>
                                            {sub.name}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                            {new Date(sub.examDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-6 rounded-xl shadow-lg text-white">
                            <h3 className="text-white text-opacity-80 text-sm font-semibold uppercase mb-4">Motivation</h3>
                            <p className="text-lg italic">"Consistency is the key to mastery. Stick to the plan!"</p>
                        </div>
                    </div>

                    {/* Topics to Cover */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800">Topics to Cover</h3>
                                <p className="text-xs text-gray-400 mt-1">Allocated based on exam urgency and weakness</p>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {plan.generatedPlan.map((item, index) => (
                                    <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${item.isWeak ? 'bg-red-100 text-red-600' : 'bg-brand-50 text-brand-700'
                                                }`}>
                                                {item.subject.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-lg">{item.subject}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">
                                                        Exam: {new Date(item.examDate).toLocaleDateString()}
                                                    </span>
                                                    {item.isWeak && (
                                                        <span className="text-xs text-red-500 font-medium bg-red-50 px-2 rounded">Focus Area</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Topics Section */}
                                        <div className="pl-16">
                                            {/* Display extracted topics if available */}
                                            {plan.subjects.find(s => s.name === item.subject)?.topics?.length > 0 ? (
                                                <div className="p-4 bg-brand-50 rounded-lg border border-brand-50">
                                                    <div className="flex flex-wrap gap-2">
                                                        {plan.subjects.find(s => s.name === item.subject).topics.map((topic, tidx) => (
                                                            <span key={tidx} className="text-sm bg-white text-brand-900 px-3 py-1.5 rounded-full border border-brand-300">
                                                                {topic}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                    <p className="text-sm text-gray-500 italic">No topics extracted yet. Upload study materials to see topics.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 bg-gray-50 border-t border-gray-100">
                                <p className="text-center text-gray-500 text-sm">
                                    Total: {plan.generatedPlan.reduce((acc, curr) => acc + curr.allocatedMinutes, 0)} minutes / {plan.studyHoursPerDay * 60} minutes planned
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
};

export default StudyPlanResult;
