import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import StudentLayout from '../layouts/StudentLayout';
import PageHeader from '../components/PageHeader';
import { FiTrendingUp, FiClock, FiTarget, FiBook, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const AnalyticsDashboard = () => {
    const location = useLocation();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [analytics, setAnalytics] = useState({
        totalStudyHours: 0,
        completedHours: 0,
        overallCompletion: 0,
        totalTasks: 0,
        completedTasks: 0,
        studyHoursTrend: [],
        subjectDistribution: [],
        subjectCompletion: [],
        examReadiness: []
    });

    useEffect(() => {
        fetchAnalytics();
    }, [location.pathname]);

    const fetchAnalytics = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.data) {
                setPlan(data.data);
                calculateAnalytics(data.data);
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const calculateAnalytics = (planData) => {
        if (!planData.timetable || !planData.timetable.dailySchedule) {
            return;
        }

        const schedule = planData.timetable.dailySchedule;
        
        // Calculate total and completed hours/tasks
        let totalMinutes = 0;
        let completedMinutes = 0;
        let totalTasks = 0;
        let completedTasks = 0;

        schedule.forEach(day => {
            totalMinutes += day.totalMinutes || 0;
            completedMinutes += day.completedMinutes || 0;
            totalTasks += day.tasks?.length || 0;
            completedTasks += day.tasks?.filter(t => t.isCompleted).length || 0;
        });

        const totalStudyHours = (totalMinutes / 60).toFixed(1);
        const completedHours = (completedMinutes / 60).toFixed(1);
        const overallCompletion = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;

        // Study Hours Trend (last 14 days or all days if less)
        const trendData = schedule.slice(0, 14).map(day => ({
            day: `Day ${day.day}`,
            planned: parseFloat((day.totalMinutes / 60).toFixed(1)),
            completed: parseFloat((day.completedMinutes / 60).toFixed(1)),
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));

        // Subject Time Distribution (Pie Chart)
        const subjectMap = {};
        schedule.forEach(day => {
            day.tasks?.forEach(task => {
                if (!subjectMap[task.subject]) {
                    subjectMap[task.subject] = 0;
                }
                subjectMap[task.subject] += task.durationMinutes || 0;
            });
        });

        const subjectDistribution = Object.entries(subjectMap).map(([subject, minutes]) => ({
            subject,
            hours: parseFloat((minutes / 60).toFixed(1)),
            minutes: minutes
        }));

        // Subject Completion Percentage
        const subjectCompletionMap = {};
        schedule.forEach(day => {
            day.tasks?.forEach(task => {
                if (!subjectCompletionMap[task.subject]) {
                    subjectCompletionMap[task.subject] = {
                        total: 0,
                        completed: 0
                    };
                }
                subjectCompletionMap[task.subject].total += task.durationMinutes || 0;
                if (task.isCompleted) {
                    subjectCompletionMap[task.subject].completed += task.durationMinutes || 0;
                }
            });
        });

        const subjectCompletion = Object.entries(subjectCompletionMap).map(([subject, data]) => ({
            subject,
            completion: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
            completedHours: parseFloat((data.completed / 60).toFixed(1)),
            totalHours: parseFloat((data.total / 60).toFixed(1))
        })).sort((a, b) => b.completion - a.completion);

        // Calculate Exam Readiness Score
        const examReadiness = planData.subjects?.map(subject => {
            const subjectData = subjectCompletionMap[subject.name] || { total: 0, completed: 0 };
            const completion = subjectData.total > 0 ? Math.round((subjectData.completed / subjectData.total) * 100) : 0;
            const timeSpent = parseFloat((subjectData.completed / 60).toFixed(1));
            
            // Calculate days until exam
            const examDate = new Date(subject.examDate);
            const today = new Date();
            const daysUntil = Math.max(0, Math.ceil((examDate - today) / (1000 * 60 * 60 * 24)));
            
            // Readiness score is purely based on completion (0-100)
            // Starts at 0, increases only when tasks are completed
            const score = completion;
            
            return {
                subject: subject.name,
                score,
                completion,
                timeSpent,
                daysUntil,
                isWeak: subject.isWeak
            };
        }).sort((a, b) => a.daysUntil - b.daysUntil) || [];

        setAnalytics({
            totalStudyHours,
            completedHours,
            overallCompletion,
            totalTasks,
            completedTasks,
            studyHoursTrend: trendData,
            subjectDistribution,
            subjectCompletion,
            examReadiness
        });
    };

    const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F9D56E', '#FF8C42', '#9B5DE5', '#00BBF9', '#F15BB5'];

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex justify-center items-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
                </div>
            </StudentLayout>
        );
    }

    if (!plan || !plan.timetable || !plan.timetable.dailySchedule) {
        return (
            <StudentLayout>
                <div className="bg-brand-50 border-l-4 border-brand-700 text-brand-900 px-4 py-3 rounded-md">
                    No timetable data found. Your study plan needs a timetable to show analytics.
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout
            header={
                <PageHeader
                    icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    title="Analytics Dashboard"
                    subtitle="Track your study progress and performance"
                >
                    <button
                        onClick={() => fetchAnalytics(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </PageHeader>
            }
        >
            <div>                <div className="mt-8">

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg transform transition hover:scale-105">
                        <div className="flex items-center justify-between mb-4">
                            <FiClock className="text-3xl opacity-80" />
                            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                                <span className="text-xs font-semibold">Total</span>
                            </div>
                        </div>
                        <p className="text-4xl font-bold mb-1">{analytics.totalStudyHours}h</p>
                        <p className="text-blue-100 text-sm">Total Planned Hours</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl p-6 text-white shadow-lg transform transition hover:scale-105">
                        <div className="flex items-center justify-between mb-4">
                            <FiTrendingUp className="text-3xl opacity-80" />
                            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                                <span className="text-xs font-semibold">Done</span>
                            </div>
                        </div>
                        <p className="text-4xl font-bold mb-1">{analytics.completedHours}h</p>
                        <p className="text-emerald-100 text-sm">Hours Completed</p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-6 text-white shadow-lg transform transition hover:scale-105">
                        <div className="flex items-center justify-between mb-4">
                            <FiTarget className="text-3xl opacity-80" />
                            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                                <span className="text-xs font-semibold">Rate</span>
                            </div>
                        </div>
                        <p className="text-4xl font-bold mb-1">{analytics.overallCompletion}%</p>
                        <p className="text-amber-100 text-sm">Overall Completion</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg transform transition hover:scale-105">
                        <div className="flex items-center justify-between mb-4">
                            <FiBook className="text-3xl opacity-80" />
                            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                                <span className="text-xs font-semibold">Tasks</span>
                            </div>
                        </div>
                        <p className="text-4xl font-bold mb-1">{analytics.completedTasks}/{analytics.totalTasks}</p>
                        <p className="text-purple-100 text-sm">Tasks Completed</p>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Study Hours Trend - Line Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <FiTrendingUp className="text-2xl text-brand-700" />
                            <h2 className="text-xl font-bold text-gray-800">Study Hours Trend</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.studyHoursTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="day" 
                                    tick={{ fontSize: 12 }}
                                    stroke="#9CA3AF"
                                />
                                <YAxis 
                                    tick={{ fontSize: 12 }}
                                    stroke="#9CA3AF"
                                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#fff', 
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value) => [`${value}h`, '']}
                                    labelFormatter={(label, payload) => {
                                        if (payload && payload[0]) {
                                            return `${label} (${payload[0].payload.date})`;
                                        }
                                        return label;
                                    }}
                                />
                                <Legend 
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="planned" 
                                    stroke="#9B5DE5" 
                                    strokeWidth={2}
                                    name="Planned"
                                    dot={{ fill: '#9B5DE5', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="completed" 
                                    stroke="#4ECDC4" 
                                    strokeWidth={2}
                                    name="Completed"
                                    dot={{ fill: '#4ECDC4', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Subject Time Distribution - Pie Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <FiCalendar className="text-2xl text-brand-700" />
                            <h2 className="text-xl font-bold text-gray-800">Subject Time Distribution</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics.subjectDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ subject, hours, percent }) => `${subject}: ${hours}h (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="hours"
                                >
                                    {analytics.subjectDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#fff', 
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value) => [`${value} hours`, 'Time']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {analytics.subjectDistribution.map((subject, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    ></div>
                                    <span className="text-gray-700">{subject.subject}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Subject Completion - Smaller Bar Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <FiBook className="text-2xl text-brand-700" />
                            <h2 className="text-xl font-bold text-gray-800">Completion Per Subject</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics.subjectCompletion} layout="vertical" barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis 
                                    type="number" 
                                    domain={[0, 100]}
                                    tick={{ fontSize: 12 }}
                                    stroke="#9CA3AF"
                                />
                                <YAxis 
                                    type="category" 
                                    dataKey="subject" 
                                    tick={{ fontSize: 12 }}
                                    stroke="#9CA3AF"
                                    width={100}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#fff', 
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value, name, props) => [
                                        `${value}% (${props.payload.completedHours}h / ${props.payload.totalHours}h)`,
                                        'Completion'
                                    ]}
                                />
                                <Bar 
                                    dataKey="completion" 
                                    fill="#4ECDC4"
                                    radius={[0, 8, 8, 0]}
                                    label={{ 
                                        position: 'right', 
                                        formatter: (value) => `${value}%`,
                                        fontSize: 12,
                                        fill: '#374151'
                                    }}
                                >
                                    {analytics.subjectCompletion.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.completion >= 75 ? '#4ECDC4' : entry.completion >= 50 ? '#F9D56E' : entry.completion >= 25 ? '#FF8C42' : '#FF6B6B'} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Exam Readiness Score */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <FiTarget className="text-2xl text-brand-700" />
                            <h2 className="text-xl font-bold text-gray-800">Exam Readiness Score</h2>
                        </div>
                        <div className="space-y-4">
                            {analytics.examReadiness.map((subject, index) => {
                                const scoreColor = 
                                    subject.score >= 80 ? 'text-brand-700' :
                                    subject.score >= 60 ? 'text-brand-700' :
                                    subject.score >= 40 ? 'text-yellow-600' :
                                    'text-red-600';
                                
                                const bgColor = 
                                    subject.score >= 80 ? 'bg-green-50 border-green-200' :
                                    subject.score >= 60 ? 'bg-brand-50 border-brand-300' :
                                    subject.score >= 40 ? 'bg-yellow-50 border-yellow-200' :
                                    'bg-red-50 border-red-200';

                                return (
                                    <div key={index} className={`border-2 rounded-lg p-4 ${bgColor}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-800">{subject.subject}</h3>
                                                <p className="text-xs text-gray-600">{subject.daysUntil} days until exam</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-3xl font-bold ${scoreColor}`}>{subject.score}</p>
                                                <p className="text-xs text-gray-500">Readiness</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                                            <span>{subject.completion}% complete</span>
                                            <span>•</span>
                                            <span>{subject.timeSpent}h studied</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                </div>{/* end mt-8 */}
            </div>
        </StudentLayout>
    );
};

export default AnalyticsDashboard;
