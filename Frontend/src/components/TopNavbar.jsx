import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const TopNavbar = ({ role, pageName }) => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const [profilePic, setProfilePic] = useState('');

    useEffect(() => {
        const fetchProfilePic = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token || !user) return;

                // Determine API endpoint based on role
                let endpoint = '';
                if (role === 'teacher') {
                    endpoint = `https://examcoach-backend-mnoy.onrender.com/api/teachers/profile/${user.id}`;
                } else if (role === 'admin') {
                    // Admins don't have a profile picture endpoint, so skip
                    return;
                }

                if (!endpoint) return;

                const response = await fetch(endpoint, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.data.profilePic) {
                        setProfilePic(data.data.profilePic);
                    }
                }
            } catch (err) {
                console.error('Error fetching profile picture:', err);
            }
        };

        fetchProfilePic();
    }, [user?.id, role]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <nav className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40 shadow-sm">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">{pageName}</h2>
                    <p className="text-sm text-gray-500 capitalize">{role} Portal</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <button className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* User Menu */}
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-200 shadow-md">
                            {profilePic ? (
                                <img
                                    src={profilePic}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center text-white font-semibold">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default TopNavbar;
