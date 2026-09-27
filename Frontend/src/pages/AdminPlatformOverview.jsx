import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const StatCard = ({ label, value, sub, color }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6`}>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-4xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
);

const AdminPlatformOverview = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('https://examcoach-backend-mnoy.onrender.com/api/admin/overview', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                if (json.success) setData(json.data);
                else setError('Failed to load overview data');
            } catch (err) {
                setError('Server error');
            } finally {
                setLoading(false);
            }
        };
        fetchOverview();
    }, []);

    return (
        <div className="flex min-h-screen bg-brand-50">
            <Sidebar role="admin" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="admin" pageName="Platform Overview" />
                
                <PageHeader 
                    icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    title="Platform Overview"
                    subtitle="System-wide analytics and health indicators"
                />

                <div className="p-8 max-w-7xl mx-auto space-y-8 relative z-10 -mt-8">

                    {loading && (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-700" />
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
                    )}

                    {data && (
                        <div className="space-y-8">

                            {/* ── Totals ── */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard label="Total Students" value={data.totals.totalStudents} color="text-brand-700" sub={`+${data.newRegistrations.studentsThisMonth} this month`} />
                                <StatCard label="Total Teachers" value={data.totals.totalTeachers} color="text-brand-700" sub={`+${data.newRegistrations.teachersThisMonth} this month`} />
                                <StatCard label="Total Streams" value={data.totals.totalStreams} color="text-brand-700" />
                                <StatCard label="Total Subjects" value={data.totals.totalSubjects} color="text-orange-500" />
                            </div>

                            {/* ── Quick highlights ── */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard label="New Students (Week)" value={data.newRegistrations.studentsThisWeek} color="text-brand-700" />
                                <StatCard label="New Teachers (Week)" value={data.newRegistrations.teachersThisWeek} color="text-green-500" />
                                <StatCard label="Active Students (30d)" value={data.recentlyActiveStudents} color="text-brand-700" sub="Registered in last 30 days" />
                                <StatCard label="Google Calendar Integrations" value={data.googleCalendarIntegrations} color="text-brand-700" sub="Students connected" />
                            </div>

                            {/* ── Registration Trend ── */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-bold text-gray-800 mb-6">Registration Trend (Last 8 Weeks)</h2>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={data.registrationTrend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="students" stroke="#3B82F6" strokeWidth={2} name="Students" dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="teachers" stroke="#10B981" strokeWidth={2} name="Teachers" dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* ── AI Usage ── */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-bold text-gray-800 mb-6">AI Usage — Last 6 Months</h2>
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <StatCard label="Groq Total" value={data.aiUsage.groqTotal} color="text-brand-700" sub={`Quizzes: ${data.aiUsage.groqQuizzes} · Study Plans: ${data.aiUsage.groqStudyPlans}`} />
                                    <StatCard label="Gemini Total" value={data.aiUsage.geminiTotal} color="text-brand-700" />
                                </div>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={data.aiUsage.trend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="groq" name="Groq" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="gemini" name="Gemini" fill="#EC4899" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPlatformOverview;
