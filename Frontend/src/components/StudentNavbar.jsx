import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

const StudentNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));
    const [profilePic, setProfilePic] = useState('');
    const [hasPlan, setHasPlan] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchProfilePic = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token || !user) return;
                const response = await fetch(`https://examcoach-backend-mnoy.onrender.com/api/students/profile/${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.data.profilePic) setProfilePic(data.data.profilePic);
                }
            } catch (err) {
                console.error('Error fetching profile picture:', err);
            }
        };
        fetchProfilePic();
    }, [user?.id]);

    useEffect(() => {
        const checkPlan = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setHasPlan(data.success && !!data.data);
            } catch {
                setHasPlan(false);
            }
        };
        checkPlan();
    }, [location.pathname]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleStudyPlanClick = () => {
        if (!hasPlan) {
            navigate('/student/create-plan');
        } else {
            setDropdownOpen((prev) => !prev);
        }
    };

    const studyPlanDropdownItems = [
        { label: 'My Timetable', path: '/student/timetable' },
        { label: 'Study Plan View', path: '/student/view-plan' },
        { label: 'Study Journal', path: '/student/journal' },
        { label: 'Analytics', path: '/student/analytics' },
    ];

    const isStudyPlanActive = [
        '/student/timetable',
        '/student/view-plan',
        '/student/journal',
        '/student/analytics',
        '/student/create-plan',
    ].includes(location.pathname);

    return (
        <nav className="flex justify-between items-center px-8 py-4 bg-white shadow-md sticky top-0 z-50 border-b border-gray-100">
            <div className="navbar-brand">
                <Link
                    to="/student/home"
                    className="text-2xl font-bold bg-gradient-to-r from-brand-700 to-brand-900 bg-clip-text text-transparent hover:from-brand-900 hover:to-brand-900 transition-all flex items-center gap-2"
                >
                    <svg className="w-6 h-6 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    ExamCoach
                </Link>
            </div>

            <div className="flex gap-8 items-center">
                <Link to="/student/home" className="text-gray-700 font-medium hover:text-brand-700 transition-colors relative group">
                    Home
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/student/courses" className="text-gray-700 font-medium hover:text-brand-700 transition-colors relative group">
                    My Courses
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/student/quizzes" className="text-gray-700 font-medium hover:text-brand-700 transition-colors relative group">
                    My Quizzes
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/student/ai_learning_lab" className="text-gray-700 font-medium hover:text-brand-700 transition-colors relative group">
                    AI Learning Lab
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/student/quiz-generator" className="text-gray-700 font-medium hover:text-brand-700 transition-colors relative group">
                    AI Quiz Generator
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-700 group-hover:w-full transition-all duration-300"></span>
                </Link>

                {/* My Study Plan nav item */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={handleStudyPlanClick}
                        className={`flex items-center gap-1 font-medium transition-colors relative group ${
                            isStudyPlanActive ? 'text-brand-700' : 'text-gray-700 hover:text-brand-700'
                        }`}
                    >
                        My Study Plan
                        {hasPlan && (
                            <svg
                                className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        )}
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-700 group-hover:w-full transition-all duration-300"></span>
                    </button>

                    {hasPlan && dropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                            {studyPlanDropdownItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setDropdownOpen(false)}
                                    className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                                        location.pathname === item.path
                                            ? 'text-brand-700 bg-brand-50'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-brand-700'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Link to="/student/profile" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer px-4 py-2 rounded-full">
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                        {profilePic ? (
                            <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center text-white font-semibold text-sm">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                        )}
                    </div>
                    <span className="font-medium text-gray-800">{user?.name}</span>
                </Link>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-white border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-500 hover:text-white transition-all shadow-sm hover:shadow-md"
                >
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default StudentNavbar;
