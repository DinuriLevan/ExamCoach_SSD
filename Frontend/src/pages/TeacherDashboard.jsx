import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import CheatingAlert from '../components/CheatingAlert';

const TeacherDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-brand-50 to-gray-100">
            <CheatingAlert />
            <Sidebar role="teacher" />
            <div className="flex-1 ml-64">
                <TopNavbar role="teacher" pageName="Dashboard" />
                
                <PageHeader 
                    icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    title="Teacher Dashboard"
                    subtitle="Welcome back! Manage your classes and students."
                />

                <div className="p-8 -mt-8 relative z-10">
                    <div className="max-w-7xl mx-auto">
                        <main>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Create Quiz Card */}
                                <div 
                                    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden cursor-pointer"
                                    onClick={() => navigate('/teacher/create-quiz')}
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-brand-50 rounded-full blur-2xl opacity-60 -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-brand-700 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <span className="text-gray-400 group-hover:text-brand-700 transition-colors">
                                                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-brand-700 transition-colors">
                                            Create Quiz
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            Create new quizzes for your students to practice and test their knowledge.
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <span className="text-sm font-semibold text-brand-700 group-hover:text-green-700 transition-colors flex items-center gap-1">
                                                Create Now
                                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* My Quizzes Card */}
                                <div 
                                    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden cursor-pointer"
                                    onClick={() => navigate('/teacher/view-quizzes')}
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100 to-red-100 rounded-full blur-2xl opacity-60 -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                            <span className="text-gray-400 group-hover:text-orange-600 transition-colors">
                                                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors">
                                            My Quizzes
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            View and manage all the quizzes you've created for your students.
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <span className="text-sm font-semibold text-orange-600 group-hover:text-orange-700 transition-colors flex items-center gap-1">
                                                View Quizzes
                                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Today's Schedule */}
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-gradient-to-br from-brand-300 to-brand-700 rounded-lg flex items-center justify-center text-white">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">Today's Schedule</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-transparent rounded-xl border border-gray-100">
                                            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 font-medium">No classes scheduled for today</p>
                                                <p className="text-gray-400 text-sm mt-1">Enjoy your free time!</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
