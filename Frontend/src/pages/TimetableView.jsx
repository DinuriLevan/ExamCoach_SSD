import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../layouts/StudentLayout';
import PageHeader from '../components/PageHeader';
import { FiCheckCircle, FiCircle, FiCalendar, FiClock, FiTrendingUp, FiBook, FiRefreshCw } from 'react-icons/fi';

const TimetableView = () => {
    const navigate = useNavigate();
    const [timetable, setTimetable] = useState(null);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(null);
    const [viewMode, setViewMode] = useState('week'); // 'week' or 'all'
    const [dayNote, setDayNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        // Update note when selected day changes
        if (timetable && selectedDay) {
            const day = timetable.schedule.find(d => d.day === selectedDay);
            setDayNote(day?.note || '');
        }
    }, [selectedDay]); // Remove timetable from dependencies

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [timetableRes, progressRes] = await Promise.all([
                fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan/timetable', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan/progress', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const timetableData = await timetableRes.json();
            const progressData = await progressRes.json();

            if (timetableData.success) {
                setTimetable(timetableData.data);
                // Set selected day to current day
                if (progressData.success && progressData.data.overall.currentDay) {
                    setSelectedDay(progressData.data.overall.currentDay);
                }
            }
            if (progressData.success) {
                setProgress(progressData.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTask = async (day, taskIndex) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`https://examcoach-backend-mnoy.onrender.com/api/study-plan/timetable/task/${day}/${taskIndex}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Refresh data
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedDay || !dayNote.trim()) return;
        
        console.log('[Timetable] Saving note for day', selectedDay, ':', dayNote);
        
        setSavingNote(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://examcoach-backend-mnoy.onrender.com/api/study-plan/timetable/note/${selectedDay}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ note: dayNote })
            });
            
            const data = await response.json();
            console.log('[Timetable] Save response:', data);
            
            if (data.success) {
                // Refresh data to show the saved note
                await fetchData();
                alert('Note saved successfully! You can edit it in Study Journal.');
            } else {
                alert('Failed to save note. Please try again.');
            }
        } catch (err) {
            console.error('[Timetable] Save error:', err);
            alert('Error saving note. Please try again.');
        } finally {
            setSavingNote(false);
        }
    };

    const getProgressColor = (percentage) => {
        if (percentage <= 25) return 'bg-red-500';
        if (percentage <= 50) return 'bg-yellow-500';
        if (percentage <= 75) return 'bg-brand-700';
        return 'bg-brand-700';
    };

    const getMotivationalMessage = (percentage) => {
        if (percentage <= 25) return "Just getting started! Keep going!";
        if (percentage <= 50) return "Making progress! You're doing great!";
        if (percentage <= 75) return "More than halfway there! Keep it up!";
        if (percentage < 100) return "Almost there! Final push!";
        return "Congratulations! You've completed your study plan! 🎉";
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

    if (!timetable || !timetable.schedule || timetable.schedule.length === 0) {
        return (
            <StudentLayout>
                <div className="bg-white p-12 rounded-3xl shadow-xl text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">No Timetable Found</h2>
                    <p className="text-gray-600 mb-8">Create a study plan to generate your personalized timetable.</p>
                    <button
                        onClick={() => navigate('/student/create-plan')}
                        className="bg-gradient-to-r from-brand-700 to-brand-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-900 transition-all"
                    >
                        Create Study Plan
                    </button>
                </div>
            </StudentLayout>
        );
    }

    const currentDaySchedule = timetable.schedule.find(d => d.day === selectedDay) || timetable.schedule[0];
    const completionPercentage = progress?.overall?.completionPercentage || 0;

    // Get days to display based on view mode
    const displayDays = viewMode === 'week' 
        ? timetable.schedule.slice(Math.max(0, selectedDay - 3), Math.min(timetable.schedule.length, selectedDay + 4))
        : timetable.schedule;

    return (
        <StudentLayout
            header={
                <PageHeader
                    icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    title="My Study Timetable"
                    subtitle={getMotivationalMessage(completionPercentage)}
                >
                    <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                        <p className="text-xs text-white/70 uppercase tracking-wider">Progress</p>
                        <p className="text-2xl font-black text-white">{completionPercentage}%</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all"
                    >
                        <FiRefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </PageHeader>
            }
        >
            <div className="space-y-8">
                {/* View Mode Toggle */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                viewMode === 'week' 
                                    ? 'bg-brand-700 text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Week View
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                viewMode === 'all' 
                                    ? 'bg-brand-700 text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            All Days
                        </button>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                    >
                        <FiRefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Day Selector */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FiCalendar className="text-brand-700" />
                                Select Day
                            </h2>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {displayDays.map((day) => {
                                    const isSelected = day.day === selectedDay;
                                    const isCurrent = day.day === progress?.overall?.currentDay;
                                    const dayProgress = day.tasks.length > 0 
                                        ? Math.round((day.tasks.filter(t => t.isCompleted).length / day.tasks.length) * 100)
                                        : 0;

                                    return (
                                        <button
                                            key={day.day}
                                            onClick={() => setSelectedDay(day.day)}
                                            className={`w-full text-left p-4 rounded-xl transition-all ${
                                                isSelected 
                                                    ? 'bg-brand-50 border-2 border-brand-700' 
                                                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${isSelected ? 'text-brand-700' : 'text-gray-800'}`}>
                                                        Day {day.day}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                                            Today
                                                        </span>
                                                    )}
                                                </div>
                                                {day.isCompleted && (
                                                    <FiCheckCircle className="text-green-500 w-5 h-5" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className={`h-full rounded-full transition-all ${getProgressColor(dayProgress)}`}
                                                        style={{ width: `${dayProgress}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-semibold text-gray-600">{dayProgress}%</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: Day Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Day Header */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-1">
                                        Day {currentDaySchedule.day}
                                    </h2>
                                    <p className="text-gray-500">
                                        {new Date(currentDaySchedule.date).toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 mb-1">Total Time</p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {Math.floor(currentDaySchedule.totalMinutes / 60)}h {currentDaySchedule.totalMinutes % 60}m
                                    </p>
                                </div>
                            </div>

                            {/* Day Progress */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-semibold text-gray-700">Day Progress</span>
                                    <span className="text-sm font-bold text-gray-800">
                                        {currentDaySchedule.completedMinutes}/{currentDaySchedule.totalMinutes} min
                                    </span>
                                </div>
                                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className="bg-brand-700 h-full transition-all duration-500"
                                        style={{ width: `${(currentDaySchedule.completedMinutes / currentDaySchedule.totalMinutes) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Tasks */}
                        <div className="space-y-4">
                            {currentDaySchedule.tasks.map((task, index) => (
                                <div 
                                    key={index}
                                    className={`bg-white rounded-2xl shadow-lg p-6 transition-all ${
                                        task.isCompleted ? 'opacity-75' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => handleToggleTask(currentDaySchedule.day, index)}
                                            className="flex-shrink-0 mt-1"
                                        >
                                            {task.isCompleted ? (
                                                <div className="w-6 h-6 bg-brand-700 rounded-full flex items-center justify-center">
                                                    <FiCheckCircle className="w-4 h-4 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-brand-700 transition-colors"></div>
                                            )}
                                        </button>

                                        {/* Task Content */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className={`font-bold text-lg ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                            {task.topic}
                                                        </h3>
                                                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                                            task.type === 'study' 
                                                                ? 'bg-brand-50 text-brand-900' 
                                                                : 'bg-brand-50 text-brand-900'
                                                        }`}>
                                                            {task.type === 'study' ? '📚 Study' : '🔄 Revision'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">{task.subject}</p>
                                                    {task.description && (
                                                        <p className="text-sm text-gray-500">{task.description}</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <FiClock className="w-4 h-4" />
                                                        <span className="font-semibold">{task.durationMinutes} min</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {task.isCompleted && task.completedAt && (
                                                <p className="text-xs text-brand-700 mt-2">
                                                    ✓ Completed on {new Date(task.completedAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Subject Summary */}
                        {timetable.summary && timetable.summary.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FiTrendingUp className="text-green-500" />
                                    Subject Progress
                                </h3>
                                <div className="space-y-4">
                                    {progress?.subjectProgress?.map((subject, index) => (
                                        <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <FiBook className="text-brand-700" />
                                                    <span className="font-semibold text-gray-800">{subject.subject}</span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-600">
                                                    {subject.completionPercentage}%
                                                </span>
                                            </div>
                                            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all ${getProgressColor(subject.completionPercentage)}`}
                                                    style={{ width: `${subject.completionPercentage}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>{subject.totalTopics} topics</span>
                                                <span>{Math.floor(subject.completedMinutes / 60)}h / {Math.floor(subject.totalMinutes / 60)}h</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Day Note */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FiBook className="text-brand-700" />
                                Day Note
                            </h3>
                            {currentDaySchedule.note && currentDaySchedule.note.trim() !== '' ? (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
                                    <p className="text-gray-700 whitespace-pre-wrap">{currentDaySchedule.note}</p>
                                    <button
                                        onClick={() => navigate('/student/journal')}
                                        className="text-xs text-brand-700 hover:text-brand-900 mt-3 flex items-center gap-1"
                                    >
                                        <FiBook className="w-3 h-3" />
                                        Edit this note in Study Journal
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <textarea
                                        value={dayNote}
                                        onChange={(e) => setDayNote(e.target.value)}
                                        placeholder="Add notes about your study session, challenges, or achievements..."
                                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-yellow-400 bg-yellow-50 min-h-[120px] resize-none"
                                    />
                                    <div className="mt-3 flex justify-end">
                                        <button
                                            onClick={handleSaveNote}
                                            disabled={savingNote || !dayNote.trim()}
                                            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {savingNote ? 'Saving...' : 'Save Note'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
};

export default TimetableView;
