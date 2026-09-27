import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const AdminQuizAnalytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/quiz/admin/stats', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();

                if (data.success) {
                    setStats(data);
                } else {
                    setError('Failed to load analytics data');
                }
            } catch (err) {
                console.error(err);
                setError('Server Error');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // Prepare chart data
    const difficultyData = stats ? Object.keys(stats.difficultyDistribution).map(key => ({
        name: key,
        count: stats.difficultyDistribution[key]
    })) : [];

    const passRateData = stats ? [
        { name: 'Passed', value: parseFloat(stats.passRate) },
        { name: 'Failed', value: 100 - parseFloat(stats.passRate) }
    ] : [];

    const COLORS = ['#10B981', '#EF4444']; // Green, Red

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="flex min-h-screen bg-brand-50">
            <Sidebar role="admin" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="admin" pageName="Analytics" />

                <PageHeader 
                    icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    title="System Analytics"
                    subtitle="Overview of AI Quiz Generation usage and performance"
                />

                <div className="p-8 max-w-7xl mx-auto space-y-8 relative z-10 -mt-8">

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-700"></div>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
                        ) : (
                            <div className="space-y-8 animate-fade-in">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 uppercase">Total Quizzes</p>
                                                <p className="text-3xl font-bold text-gray-900">{stats.totalQuizzes}</p>
                                            </div>
                                            <div className="p-3 bg-brand-50 rounded-lg text-brand-700">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 uppercase">Avg Score</p>
                                                <p className="text-3xl font-bold text-gray-900">{stats.avgScore}%</p>
                                            </div>
                                            <div className="p-3 bg-brand-50 rounded-lg text-brand-700">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 uppercase">Total Questions</p>
                                                <p className="text-3xl font-bold text-gray-900">{stats.totalQuestionsGenerated}</p>
                                            </div>
                                            <div className="p-3 bg-brand-50 rounded-lg text-brand-700">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 uppercase">Pass Rate</p>
                                                <p className={`text-3xl font-bold ${parseFloat(stats.passRate) >= 70 ? 'text-brand-700' : 'text-orange-500'}`}>{stats.passRate}%</p>
                                            </div>
                                            <div className="p-3 bg-green-100 rounded-lg text-brand-700">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Difficulty Distribution */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-800 mb-6">Quiz Difficulty Distribution</h3>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={difficultyData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip cursor={{ fill: '#F3F4F6' }} />
                                                    <Legend />
                                                    <Bar dataKey="count" fill="#8B5CF6" name="Quizzes Generated" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Pass Rate Pie Chart */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-800 mb-6">Success Rate (Pass vs Fail)</h3>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={passRateData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={80}
                                                        outerRadius={110}
                                                        fill="#8884d8"
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {passRateData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Activity Table */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Quiz Activity</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                                    <th className="p-4 rounded-tl-lg">Date</th>
                                                    <th className="p-4">Student</th>
                                                    <th className="p-4">Difficulty</th>
                                                    <th className="p-4">Score</th>
                                                    <th className="p-4 rounded-tr-lg">Result</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-sm">
                                                {stats.recentActivity.map((quiz) => {
                                                    const percentage = (quiz.score / quiz.totalQuestions) * 100;
                                                    const passed = percentage >= 60;
                                                    return (
                                                        <tr key={quiz._id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="p-4 font-medium text-gray-900">{formatDate(quiz.createdAt)}</td>
                                                            <td className="p-4 text-gray-600">{quiz.student ? quiz.student.name : 'Unknown'}</td>
                                                            <td className="p-4">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${quiz.difficulty === 'Expert' ? 'bg-red-100 text-red-700' :
                                                                        quiz.difficulty === 'Hard' ? 'bg-orange-100 text-orange-700' :
                                                                            quiz.difficulty === 'Normal' ? 'bg-brand-50 text-brand-900' :
                                                                                'bg-green-100 text-green-700'
                                                                    }`}>
                                                                    {quiz.difficulty}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-gray-700">{quiz.score}/{quiz.totalQuestions} ({Math.round(percentage)}%)</td>
                                                            <td className="p-4">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {passed ? 'Passed' : 'Failed'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {stats.recentActivity.length === 0 && (
                                                    <tr>
                                                        <td colSpan="5" className="p-4 text-center text-gray-500">No recent activity.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
};

export default AdminQuizAnalytics;
