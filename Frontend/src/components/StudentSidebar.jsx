import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    FiHome, FiPlusCircle, FiUploadCloud,
    FiActivity, FiCalendar, FiLogOut, FiUser, FiBarChart2, FiBook
} from 'react-icons/fi';

const StudentSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));
    const [hasPlan, setHasPlan] = useState(null); // null = loading, true/false = loaded
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkPlanExists();
    }, [location.pathname]); // Re-check when route changes

    const checkPlanExists = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setHasPlan(data.success && data.data);
        } catch (err) {
            setHasPlan(false);
        } finally {
            setIsLoading(false);
        }
    };

    const allMenuItems = [
        { name: 'Home', icon: <FiHome />, path: '/student/home', showAlways: true },
        { name: 'Create Study Plan', icon: <FiPlusCircle />, path: '/student/create-plan', showAlways: false },
        { name: 'My Timetable', icon: <FiCalendar />, path: '/student/timetable', showAlways: true },
        { name: 'Study Plan View', icon: <FiActivity />, path: '/student/view-plan', showAlways: true },
        { name: 'Study Journal', icon: <FiBook />, path: '/student/journal', showAlways: true },
        { name: 'Analytics', icon: <FiBarChart2 />, path: '/student/analytics', showAlways: true },
        { name: 'Profile', icon: <FiUser />, path: '/student/profile', showAlways: true },
    ];

    // Filter menu items based on plan existence
    const menuItems = allMenuItems.filter(item => {
        if (item.showAlways) return true;
        if (item.name === 'Create Study Plan') return !hasPlan;
        return true;
    });

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-700 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                    E
                </div>
                <span className="text-xl font-bold text-gray-800">ExamCoach</span>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-700"></div>
                    </div>
                ) : (
                    menuItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${location.pathname === item.path
                                    ? 'bg-brand-50 text-brand-700 font-semibold'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.name}</span>
                        </button>
                    ))
                )}
            </nav>

            <div className="p-4 mt-auto">
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center text-brand-700">
                            {user?.name?.charAt(0) || 'S'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                    <FiLogOut className="text-xl" />
                    <span className="font-semibold">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default StudentSidebar;
