import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import LessonView from '../components/LessonView';

const api = 'https://examcoach-backend-mnoy.onrender.com';

const TeacherMaterials = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    const teacherId = user?.profile?._id;

    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lessonForm, setLessonForm] = useState({ title: '', description: '' });
    const [files, setFiles] = useState([]);
    const [materialLinks, setMaterialLinks] = useState(''); // one URL per line
    const [editingId, setEditingId] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const selectedFiles = Array.from(files || []);

    useEffect(() => {
        const loadSubjects = async () => {
            try {
                const res = await fetch(`${api}/api/subjects?teacher=${teacherId}`);
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Failed to load subjects');
                setSubjects(data.data || []);
                if (data.data?.length) {
                    setSelectedSubject(data.data[0]._id);
                }
                setError('');
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (teacherId) {
            loadSubjects();
        } else {
            setLoading(false);
            setError('Teacher profile not found');
        }
    }, [teacherId]);

    useEffect(() => {
        if (!selectedSubject) return;
        const loadLessons = async () => {
            try {
                const res = await fetch(`${api}/api/subjects/${selectedSubject}/lessons`);
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Failed to load lessons');
                setLessons(data.data || []);
                setError('');
            } catch (err) {
                setError(err.message);
            }
        };
        loadLessons();
    }, [selectedSubject]);

    const handleLessonSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSubject) {
            setError('Select a subject first');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('title', lessonForm.title);
            formData.append('description', lessonForm.description);
            Array.from(files).forEach(file => formData.append('materials', file));
            const links = materialLinks.split('\n').map(link => link.trim()).filter(Boolean);
            formData.append('materialLinks', JSON.stringify(links));

            const isEdit = Boolean(editingId);
            const url = isEdit ? `${api}/api/lessons/${editingId}` : `${api}/api/subjects/${selectedSubject}/lessons`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Could not save lesson');
            if (isEdit) {
                setLessons(lessons.map((l) => (l._id === editingId ? data.data : l)));
            } else {
                setLessons([...lessons, data.data]);
            }
            setLessonForm({ title: '', description: '' });
            setFiles([]);
            setMaterialLinks('');
            setEditingId('');
            setError('');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (lesson) => {
        setEditingId(lesson._id);
        setSelectedSubject(lesson.subject?._id || selectedSubject);
        setLessonForm({
            title: lesson.title || '',
            description: lesson.description || ''
        });
        const linkList = (lesson.materials || []).filter((m) => m.isLink).map((m) => m.url).join('\n');
        setMaterialLinks(linkList);
        setFiles([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (lessonId) => {
        if (!window.confirm('Delete this lesson?')) return;
        try {
            const res = await fetch(`${api}/api/lessons/${lessonId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Delete failed');
            setLessons(lessons.filter(l => l._id !== lessonId));
            if (editingId === lessonId) {
                setEditingId('');
                setLessonForm({ title: '', description: '' });
                setFiles([]);
                setMaterialLinks('');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex min-h-screen bg-brand-50">
            <Sidebar role="teacher" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="teacher" pageName="Learning Materials" />
                
                <PageHeader 
                    icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    title="Learning Materials"
                    subtitle="Upload lesson content for your assigned subjects"
                />

                <div className="p-8">
                    <div className="max-w-7xl mx-auto relative z-10 -mt-8">

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-4">
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Subject</h2>
                                    <select
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
                                    >
                                        {subjects.map((subj) => (
                                            <option key={subj._id} value={subj._id}>{subj.name} ({subj.stream?.name})</option>
                                        ))}
                                    </select>

                                    <div className="mt-6">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">{editingId ? 'Edit Lesson' : 'Create Lesson'}</h3>
                                        <form className="space-y-3" onSubmit={handleLessonSubmit}>
                                            <input
                                                type="text"
                                                value={lessonForm.title}
                                                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                                required
                                                placeholder="Lesson title"
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
                                            />
                                            <textarea
                                                value={lessonForm.description}
                                                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                                                rows="3"
                                                placeholder="Optional description"
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
                                            />
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Material Links (one per line)</label>
                                                <textarea
                                                    value={materialLinks}
                                                    onChange={(e) => setMaterialLinks(e.target.value)}
                                                    rows="3"
                                                    placeholder="https://..."
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Materials</label>
                                                <label
                                                    htmlFor="materials-upload"
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setIsDragging(true);
                                                    }}
                                                    onDragLeave={() => setIsDragging(false)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setIsDragging(false);
                                                        if (e.dataTransfer?.files?.length) {
                                                            setFiles(e.dataTransfer.files);
                                                        }
                                                    }}
                                                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50'}`}
                                                >
                                                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                                                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M12 16V6" />
                                                            <path d="M8 10l4-4 4 4" />
                                                            <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
                                                        </svg>
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-700">Click to upload or drag and drop</p>
                                                        <p className="text-xs text-gray-500">PDF, DOCX, PPTX, images (max 10MB)</p>
                                                    </div>
                                                    <span className="mt-1 rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
                                                        Choose File
                                                    </span>
                                                    <input
                                                        id="materials-upload"
                                                        type="file"
                                                        multiple
                                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi,.mkv,.jpg,.jpeg,.png"
                                                        onChange={(e) => setFiles(e.target.files)}
                                                        className="sr-only"
                                                    />
                                                </label>
                                                {selectedFiles.length > 0 && (
                                                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                                                        {selectedFiles.map((file) => file.name).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {editingId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setEditingId(''); setLessonForm({ title: '', description: '' }); setFiles([]); setMaterialLinks(''); }}
                                                        className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                <button type="submit" className="flex-1 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-900 transition">
                                                    {editingId ? 'Update Lesson' : 'Upload Lesson'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>

                                <div className="lg:col-span-2">
                                    <LessonView lessons={lessons} onDelete={handleDelete} onEdit={handleEdit} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherMaterials;
