import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';
import Footer from '../components/Footer';

const StudentHome = () => {
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState('');
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');

        // Simulate a slight loading delay for smooth entrance
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-50 flex flex-col">
                <StudentNavbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-brand-300 border-t-brand-700 rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium">Preparing your study space...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-50 flex flex-col">
            <StudentNavbar />
            
            {/* Dynamic Glassmorphic Hero Section */}
            <div className="relative overflow-hidden bg-white border-b border-gray-100">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-brand-300/20 to-brand-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-brand-700/20 to-brand-50/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
                </div>
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <span className="inline-block py-1 px-3 rounded-full bg-brand-50 text-brand-900 text-sm font-semibold tracking-wide mb-4 border border-brand-300">
                                🚀 Ready to learn?
                            </span>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-4">
                                {greeting}, <br className="hidden md:block"/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 via-brand-900 to-brand-700">
                                    {user?.firstName || user?.name || 'Student'}!
                                </span>
                            </h1>
                            <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
                                Your personal AI-powered study dashboard. Generate quizzes, explore courses, and track your progress all in one place.
                            </p>
                        </div>
                        <div className="hidden md:flex items-center justify-center">
                            {/* Decorative element */}
                            <div className="relative w-48 h-48">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-brand-300 rounded-2xl shadow-2xl transform rotate-6 animate-pulse opacity-30"></div>
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl flex items-center justify-center text-6xl transform -rotate-3 transition-transform hover:rotate-0 duration-500">
                                    🎓
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-12">
                
                {/* AI POWER TOOLS (The "Wow" Section) */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-2xl">✨</span>
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">AI Power Tools</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* AI Learning Lab */}
                        <div 
                            onClick={() => navigate('/student/ai_learning_lab')}
                            className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 overflow-hidden cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-900/5 to-brand-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="absolute -right-12 -top-12 w-40 h-40 bg-brand-900/10 rounded-full blur-3xl group-hover:bg-brand-900/20 transition-colors duration-500"></div>
                            
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-br from-brand-900 to-brand-700 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    🤖
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-brand-900 transition-colors">AI Learning Lab</h3>
                                <p className="text-gray-600 leading-relaxed mb-6">
                                    Interact with an intelligent tutor to learn complex concepts through conversation and examples.
                                </p>
                                <div className="inline-flex items-center text-brand-900 font-semibold group-hover:gap-2 transition-all">
                                    Start Learning <span className="text-lg ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Quiz Generator */}
                        <div 
                            onClick={() => navigate('/student/quiz-generator')}
                            className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 overflow-hidden cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-700/5 to-brand-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="absolute -right-12 -top-12 w-40 h-40 bg-brand-700/10 rounded-full blur-3xl group-hover:bg-brand-700/20 transition-colors duration-500"></div>
                            
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-br from-brand-700 to-brand-900 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    ✨
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-brand-700 transition-colors">AI Quiz Generator</h3>
                                <p className="text-gray-600 leading-relaxed mb-6">
                                    Upload your PDFs or paste text notes to instantly generate mixed-type exams and test your knowledge.
                                </p>
                                <div className="inline-flex items-center text-brand-700 font-semibold group-hover:gap-2 transition-all">
                                    Generate Quiz <span className="text-lg ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>

                        {/* Smart Study Planner */}
                        <div 
                            onClick={() => navigate('/student/view-plan')}
                            className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 overflow-hidden cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-300/10 to-brand-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="absolute -right-12 -top-12 w-40 h-40 bg-brand-300/20 rounded-full blur-3xl group-hover:bg-brand-300/30 transition-colors duration-500"></div>
                            
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-br from-brand-300 to-brand-700 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    📅
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-brand-700 transition-colors">Study Planner</h3>
                                <p className="text-gray-600 leading-relaxed mb-6">
                                    Generate a personalized, time-blocked study schedule tailored to your upcoming exams.
                                </p>
                                <div className="inline-flex items-center text-brand-700 font-semibold group-hover:gap-2 transition-all">
                                    View Schedule <span className="text-lg ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CORE ACADEMIC HUB */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-2xl">📚</span>
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Core Academics</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div onClick={() => navigate('/student/courses')} className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all cursor-pointer flex items-start gap-4">
                            <div className="w-12 h-12 bg-brand-50 text-brand-900 rounded-xl flex items-center justify-center text-2xl group-hover:bg-brand-900 group-hover:text-white transition-colors">
                                📖
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-900 transition-colors">Course Explorer</h3>
                                <p className="text-sm text-gray-500 mt-1">Browse active courses & modules</p>
                            </div>
                        </div>

                        <div onClick={() => navigate('/student/quizzes')} className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all cursor-pointer flex items-start gap-4">
                            <div className="w-12 h-12 bg-brand-50 text-brand-700 rounded-xl flex items-center justify-center text-2xl group-hover:bg-brand-700 group-hover:text-white transition-colors">
                                📝
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-700 transition-colors">My Quizzes</h3>
                                <p className="text-sm text-gray-500 mt-1">Review your quiz history & scores</p>
                            </div>
                        </div>

                        <div onClick={() => navigate('/student/analytics')} className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all cursor-pointer flex items-start gap-4">
                            <div className="w-12 h-12 bg-brand-50 text-brand-900 rounded-xl flex items-center justify-center text-2xl group-hover:bg-brand-900 group-hover:text-white transition-colors">
                                📊
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-900 transition-colors">Analytics</h3>
                                <p className="text-sm text-gray-500 mt-1">Track your performance & growth</p>
                            </div>
                        </div>

                    </div>
                </section>

                {/* ORGANIZATION & TOOLS */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-2xl">🎒</span>
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Organization & Tools</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div onClick={() => navigate('/student/journal')} className="group bg-brand-900 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all cursor-pointer flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-700 text-white rounded-xl flex items-center justify-center text-2xl">
                                    📔
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-brand-50">Study Journal</h3>
                                    <p className="text-sm text-brand-300">Log your daily progress</p>
                                </div>
                            </div>
                            <span className="text-brand-300 group-hover:text-white transition-colors group-hover:translate-x-1 transform">→</span>
                        </div>

                        <div onClick={() => navigate('/student/timetable')} className="group bg-brand-900 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all cursor-pointer flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-700 text-white rounded-xl flex items-center justify-center text-2xl">
                                    ⏰
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-brand-50">Timetable</h3>
                                    <p className="text-sm text-brand-300">View weekly schedules</p>
                                </div>
                            </div>
                            <span className="text-brand-300 group-hover:text-white transition-colors group-hover:translate-x-1 transform">→</span>
                        </div>

                        <div onClick={() => navigate('/student/profile')} className="group bg-brand-900 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all cursor-pointer flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-700 text-white rounded-xl flex items-center justify-center text-2xl">
                                    👤
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-brand-50">My Profile</h3>
                                    <p className="text-sm text-brand-300">Manage account & settings</p>
                                </div>
                            </div>
                            <span className="text-brand-300 group-hover:text-white transition-colors group-hover:translate-x-1 transform">→</span>
                        </div>

                    </div>
                </section>
                
            </main>
            
            <Footer />
        </div>
    );
};

export default StudentHome;
