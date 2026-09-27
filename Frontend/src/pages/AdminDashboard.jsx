import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const StatCard = ({ label, value, sub, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-4xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
);

const AdminDashboard = () => {
    const [overview, setOverview] = useState(null);
    const [loadingOverview, setLoadingOverview] = useState(true);

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('https://examcoach-backend-mnoy.onrender.com/api/admin/overview', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                if (json.success) setOverview(json.data);
            } catch (err) {
                console.error('Overview fetch error:', err);
            } finally {
                setLoadingOverview(false);
            }
        };
        fetchOverview();
    }, []);

    return (
        <div className="flex min-h-screen bg-brand-50">
            <Sidebar role="admin" />
            <div className="flex-1 ml-64 pb-12">
                <TopNavbar role="admin" pageName="Dashboard" />
                
                <PageHeader 
                    icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    title="Platform Dashboard"
                    subtitle="Monitor system health, user growth, and active metrics"
                />

                <div className="p-8 max-w-7xl mx-auto space-y-10 relative z-10 -mt-8">

                    {/* ── Platform Overview ── */}
                    <section>

                        {loadingOverview ? (
                            <div className="flex justify-center py-10">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-700" />
                            </div>
                        ) : overview ? (
                            <div className="space-y-6">
                                {/* Totals */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard label="Total Students" value={overview.totals.totalStudents} color="text-brand-700" sub={`+${overview.newRegistrations.studentsThisMonth} this month`} />
                                    <StatCard label="Total Teachers" value={overview.totals.totalTeachers} color="text-brand-700" sub={`+${overview.newRegistrations.teachersThisMonth} this month`} />
                                    <StatCard label="Total Streams" value={overview.totals.totalStreams} color="text-brand-700" />
                                    <StatCard label="Total Subjects" value={overview.totals.totalSubjects} color="text-orange-500" />
                                </div>

                                {/* Highlights */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard label="New Students (Week)" value={overview.newRegistrations.studentsThisWeek} color="text-brand-700" />
                                    <StatCard label="New Teachers (Week)" value={overview.newRegistrations.teachersThisWeek} color="text-green-500" />
                                    <StatCard label="Active Students (30d)" value={overview.recentlyActiveStudents} color="text-brand-700" sub="Registered in last 30 days" />
                                    <StatCard label="Google Calendar Integrations" value={overview.googleCalendarIntegrations} color="text-brand-700" sub="Students connected" />
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-base font-bold text-gray-800 mb-4">Registration Trend (Last 8 Weeks)</h3>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <LineChart data={overview.registrationTrend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Legend />
                                                <Line type="monotone" dataKey="students" stroke="#3B82F6" strokeWidth={2} name="Students" dot={{ r: 3 }} />
                                                <Line type="monotone" dataKey="teachers" stroke="#10B981" strokeWidth={2} name="Teachers" dot={{ r: 3 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-base font-bold text-gray-800 mb-4">AI Usage — Last 6 Months</h3>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <StatCard label="Groq Total" value={overview.aiUsage.groqTotal} color="text-brand-700" sub={`Quizzes: ${overview.aiUsage.groqQuizzes} · Plans: ${overview.aiUsage.groqStudyPlans}`} />
                                            <StatCard label="Gemini Total" value={overview.aiUsage.geminiTotal} color="text-brand-700" />
                                        </div>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <BarChart data={overview.aiUsage.trend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="groq" name="Groq" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="gemini" name="Gemini" fill="#EC4899" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500">Could not load overview data.</p>
                        )}
                    </section>

                    {/* ── Quick Navigation ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Navigation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Link to="/admin/teachers" className="group bg-white p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-brand-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-brand-700 to-brand-900 rounded-lg flex items-center justify-center text-white shadow-lg">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400 group-hover:text-brand-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-brand-700 transition-colors">Manage Teachers</h3>
                                <p className="text-gray-600 text-sm">Add, view, update, and delete teachers.</p>
                            </Link>

                            <Link to="/admin/students" className="group bg-white p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-green-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-brand-700 rounded-lg flex items-center justify-center text-white shadow-lg">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400 group-hover:text-brand-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-brand-700 transition-colors">Manage Students</h3>
                                <p className="text-gray-600 text-sm">View and manage all registered students.</p>
                            </Link>

                            <Link to="/admin/courses" className="group bg-white p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-amber-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-2xl shadow-lg">📚</div>
                                    <svg className="w-6 h-6 text-gray-400 group-hover:text-amber-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-amber-600 transition-colors">Course Management</h3>
                                <p className="text-gray-600 text-sm">Create streams, subjects, and assign teachers.</p>
                            </Link>

                            <Link to="/admin/analytics" className="group bg-gradient-to-br from-brand-700 to-brand-900 p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 bg-white bg-opacity-20 rounded-lg flex items-center justify-center shadow-lg">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    </div>
                                    <svg className="w-6 h-6 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                </div>
                                <h3 className="text-xl font-bold mb-2">AI Quiz Analytics</h3>
                                <p className="text-white text-opacity-90 text-sm">View quiz performance metrics and reports.</p>
                            </Link>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
