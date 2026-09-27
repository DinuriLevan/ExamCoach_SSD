import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';
import LessonView from '../components/LessonView'; // Imported LessonView

const api = import.meta.env.VITE_API_URL || 'https://examcoach-backend-mnoy.onrender.com';

const AdminCoursePortal = () => {
	const token = localStorage.getItem('token');
	const [streams, setStreams] = useState([]);
	const [subjects, setSubjects] = useState([]);
	const [teachers, setTeachers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [subjectForm, setSubjectForm] = useState({ name: '', stream: '', teacher: '', description: '' });
	const [editingId, setEditingId] = useState('');
	const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
	// New State for Lesson Management
	const [viewingSubject, setViewingSubject] = useState(null);
	const [lessons, setLessons] = useState([]);
	const [lessonForm, setLessonForm] = useState({ title: '', description: '', link: '' });
	const [lessonFiles, setLessonFiles] = useState([]);
	const [editingLessonId, setEditingLessonId] = useState(''); // Added editingLessonId

	const presetStreams = [
		'Physical Science',
		'Biological Science',
		'Commerce',
		'Arts',
		'Technology',
		'Others'
	];

	const fetchBaseHeaders = useMemo(() => ({
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		'Content-Type': 'application/json'
	}), [token]);

	const parseJsonSafe = async (res) => {
		const text = await res.text();
		try {
			const json = JSON.parse(text);
			if (!res.ok) {
				throw new Error(json.error || `Request failed (${res.status})`);
			}
			return json;
		} catch (err) {
			if (res.ok) {
				throw new Error(text || 'Invalid server response');
			}
			throw new Error(text || err.message || `Request failed (${res.status})`);
		}
	};

	useEffect(() => {
		const loadData = async () => {
			try {
				const teacherPromise = token
					? fetch(`${api}/api/teachers`, { headers: { Authorization: `Bearer ${token}` } })
					: Promise.resolve(null);

				const [streamRes, subjectRes, teacherRes] = await Promise.all([
					fetch(`${api}/api/streams`),
					fetch(`${api}/api/subjects`),
					teacherPromise
				]);

				const streamData = await parseJsonSafe(streamRes);
				const subjectData = await parseJsonSafe(subjectRes);
				const teacherData = teacherRes ? await parseJsonSafe(teacherRes) : { success: true, data: [] };

				if (!streamData.success) throw new Error(streamData.error || 'Failed to load streams');
				if (!subjectData.success) throw new Error(subjectData.error || 'Failed to load subjects');
				if (!teacherData.success) throw new Error(teacherData.error || 'Failed to load teachers (admin token required)');

				const streamList = streamData.data || [];
				setStreams(streamList);
				setSubjects(subjectData.data || []);
				setTeachers(teacherData.data || []);

				// Auto-seed preset streams if none exist and we have an admin token
				if (streamList.length === 0 && token) {
					const created = [];
					for (const name of presetStreams) {
						const res = await fetch(`${api}/api/streams`, {
							method: 'POST',
							headers: fetchBaseHeaders,
							body: JSON.stringify({ name, description: '' })
						});
						const data = await parseJsonSafe(res);
						if (data.success) created.push(data.data);
					}
					if (created.length) setStreams(created);
				}

				setError('');
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [token, fetchBaseHeaders]);

	useEffect(() => {
		if (!viewingSubject) return;
		const fetchLessons = async () => {
			try {
				const res = await fetch(`${api}/api/subjects/${viewingSubject._id}/lessons`, {
					// We can reuse fetchBaseHeaders here since GET doesn't use Content-Type usually, or it's JSON
					headers: fetchBaseHeaders
				});
				const data = await parseJsonSafe(res);
				if (!data.success) throw new Error(data.error || 'Failed to load lessons');
				setLessons(data.data || []);
			} catch (err) {
				setError(err.message);
			}
		};
		fetchLessons();
	}, [viewingSubject, fetchBaseHeaders]);

	const handleLessonSubmit = async (e) => {
		e.preventDefault();
		if (!viewingSubject) return;
		try {
			const formData = new FormData();
			formData.append('title', lessonForm.title);
			formData.append('description', lessonForm.description);
			if (lessonForm.link) {
				formData.append('materialLinks', JSON.stringify([lessonForm.link]));
			}
			for (let i = 0; i < lessonFiles.length; i++) {
				formData.append('materials', lessonFiles[i]);
			}
			
			// Remove Content-Type so browser sets boundary for multipart
			const headers = { ...fetchBaseHeaders };
			delete headers['Content-Type'];

			const isEdit = Boolean(editingLessonId);
			const url = isEdit ? `${api}/api/lessons/${editingLessonId}` : `${api}/api/subjects/${viewingSubject._id}/lessons`;
			const method = isEdit ? 'PUT' : 'POST';

			const res = await fetch(url, {
				method,
				headers,
				body: formData
			});
			
			const data = await parseJsonSafe(res);
			if (!data.success) throw new Error(data.error || 'Failed to save lesson');
			
			// Refresh lessons from server
			const refreshRes = await fetch(`${api}/api/subjects/${viewingSubject._id}/lessons`, { headers: fetchBaseHeaders });
			const refreshData = await parseJsonSafe(refreshRes);
			
			setLessons(refreshData.data || []);
			setLessonForm({ title: '', description: '', link: '' });
			setLessonFiles([]);
			setEditingLessonId(''); // Reset editing state
			// Reset file input
			const fileInput = document.getElementById('lessonFileInput');
			if (fileInput) fileInput.value = '';
			setError('');
		} catch (err) {
			setError(err.message);
		}
	};

	const handleEditLesson = (lesson) => {
		setEditingLessonId(lesson._id);
		setLessonForm({
			title: lesson.title || '',
			description: lesson.description || '',
			link: (lesson.materials && lesson.materials.find(m => m.isLink)?.url) || ''
		});
		window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
	};

	const handleCancelLessonEdit = () => {
		setEditingLessonId('');
		setLessonForm({ title: '', description: '', link: '' });
		setLessonFiles([]);
		const fileInput = document.getElementById('lessonFileInput');
		if (fileInput) fileInput.value = '';
	};

	const handleDeleteLesson = async (lessonId) => {
		if (!window.confirm('Delete this lesson?')) return;
		try {
			const res = await fetch(`${api}/api/lessons/${lessonId}`, {
				method: 'DELETE',
				headers: fetchBaseHeaders
			});
			const data = await parseJsonSafe(res);
			if (!data.success) throw new Error(data.error || 'Failed to delete lesson');
			setLessons(lessons.filter(l => l._id !== lessonId));
		} catch (err) {
			setError(err.message);
		}
	};

	const handleSubjectSubmit = async (e) => {
		e.preventDefault();
		try {
			const isEdit = Boolean(editingId);
			const url = isEdit ? `${api}/api/subjects/${editingId}` : `${api}/api/subjects`;
			const method = isEdit ? 'PUT' : 'POST';
			const res = await fetch(url, {
				method,
				headers: fetchBaseHeaders,
				body: JSON.stringify(subjectForm)
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error || 'Could not save subject');
			if (isEdit) {
				setSubjects(subjects.map((s) => (s._id === editingId ? data.data : s)));
			} else {
				setSubjects([data.data, ...subjects]);
			}
			setSubjectForm({ name: '', stream: '', teacher: '', description: '' });
			setEditingId('');
			setIsSubjectModalOpen(false);
			setError('');
		} catch (err) {
			setError(err.message);
		}
	};

	const handleOpenCreateSubject = () => {
		setEditingId('');
		setSubjectForm({ name: '', stream: '', teacher: '', description: '' });
		setIsSubjectModalOpen(true);
	};

	const handleEditClick = (subj) => {
		setEditingId(subj._id);
		setSubjectForm({
			name: subj.name || '',
			stream: subj.stream?._id || subj.stream || '',
			teacher: subj.teacher?._id || subj.teacher || '',
			description: subj.description || ''
		});
		setIsSubjectModalOpen(true);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleDelete = async (id) => {
		if (!window.confirm('Delete this subject? This will remove its lessons too.')) return;
		try {
			const res = await fetch(`${api}/api/subjects/${id}`, {
				method: 'DELETE',
				headers: fetchBaseHeaders
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error || 'Delete failed');
			setSubjects(subjects.filter((s) => s._id !== id));
			if (editingId === id) {
				setEditingId('');
				setSubjectForm({ name: '', stream: '', teacher: '', description: '' });
			}
			setError('');
		} catch (err) {
			setError(err.message);
		}
	};

	const groupedSubjects = useMemo(() => {
		return subjects.reduce((acc, subj) => {
			const key = subj.stream?.name || 'Unassigned';
			acc[key] = acc[key] ? [...acc[key], subj] : [subj];
			return acc;
		}, {});
	}, [subjects]);

	return (
		<div className="flex min-h-screen bg-brand-50">
			<Sidebar role="admin" />
			<div className="flex-1 ml-64 bg-brand-50 pb-12">
				<TopNavbar role="admin" pageName="Course Management" />

				<PageHeader 
					icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					title={viewingSubject ? `Lessons: ${viewingSubject.name}` : 'Course Management'}
					subtitle={viewingSubject 
						? `Manage lessons and materials for ${viewingSubject.name}` 
						: 'Create streams, subjects, and assign teachers.'}
				>
					{!viewingSubject && (
						<button
							onClick={handleOpenCreateSubject}
							className="px-6 py-2.5 bg-white text-brand-800 rounded-xl font-semibold hover:bg-brand-50 shadow-md transition-all whitespace-nowrap"
						>
							+ Create Subject
						</button>
					)}
					{viewingSubject && (
						<button
							onClick={() => { setViewingSubject(null); setLessons([]); setError(''); }}
							className="px-6 py-2.5 bg-white/20 text-white rounded-xl shadow-md font-semibold hover:bg-white/30 transition-all whitespace-nowrap border border-white/30"
						>
							← Back to Courses
						</button>
					)}
				</PageHeader>

				<div className="p-8">
					<div className="max-w-7xl mx-auto relative z-10 -mt-10">

						{error && (
							<div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-6">
								<p className="font-medium">{error}</p>
							</div>
						)}

						{loading ? (
							<div className="flex justify-center items-center h-64">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
							</div>
						) : viewingSubject ? (
							<div className="grid grid-cols-1 gap-6">
								{/* Lesson Creator */}
								<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
									<h2 className="text-xl font-semibold text-gray-800 mb-4">{editingLessonId ? 'Edit Lesson' : 'Add New Lesson'}</h2>
									<form className="grid grid-cols-1 gap-4" onSubmit={handleLessonSubmit}>
										<div>
											<label className="block text-sm font-semibold text-gray-700 mb-2">Lesson Title</label>
											<input
												type="text"
												value={lessonForm.title}
												onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
												required
												className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700"
												placeholder="Week 1: Introduction"
											/>
										</div>
										<div>
											<label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
											<textarea
												value={lessonForm.description}
												onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
												rows="2"
												className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700"
												placeholder="Overview of the lesson..."
											/>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-semibold text-gray-700 mb-2">
													{editingLessonId ? 'Replace Materials (Optional)' : 'Upload Materials (Files)'}
												</label>
												<input
													type="file"
													id="lessonFileInput"
													multiple
													onChange={(e) => setLessonFiles(e.target.files)}
													className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 mb-1"
												/>
												<p className="text-xs text-gray-500">Supported: PDF, Doc, Video, Images</p>
											</div>
											<div>
												<label className="block text-sm font-semibold text-gray-700 mb-2">Add Link (Optional)</label>
												<input
													type="url"
													value={lessonForm.link}
													onChange={(e) => setLessonForm({ ...lessonForm, link: e.target.value })}
													className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700"
													placeholder="https://zoom.us/..."
												/>
											</div>
										</div>
										<div className="flex justify-end mt-2 gap-3">
											{editingLessonId && (
												<button 
													type="button" 
													onClick={handleCancelLessonEdit}
													className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition"
												>
													Cancel
												</button>
											)}
											<button type="submit" className="px-6 py-2.5 bg-brand-700 text-white rounded-lg hover:bg-brand-900 font-medium transition">
												{editingLessonId ? 'Update Lesson' : 'Add Lesson'}
											</button>
										</div>
									</form>
								</div>
								
								{/* Lesson List */}
								<div>
									<h2 className="text-xl font-semibold text-gray-800 mb-4">Existing Lessons</h2>
									<LessonView lessons={lessons} onDelete={handleDeleteLesson} onEdit={handleEditLesson} />
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 gap-6">
								<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
							

									<div>
										<h3 className="text-lg font-semibold text-gray-800 mb-3">Subjects by Stream</h3>
										{Object.keys(groupedSubjects).length === 0 ? (
											<p className="text-gray-500 text-sm">No subjects created yet.</p>
										) : (
											<div className="space-y-4">
												{Object.entries(groupedSubjects).map(([streamName, list]) => (
													<div key={streamName} className="border border-gray-100 rounded-lg">
														<div className="px-4 py-2 bg-gray-50 font-semibold text-gray-700">{streamName}</div>
														<div className="divide-y divide-gray-100">
															{list.map((subj) => (
																<div key={subj._id} className="px-4 py-3 flex items-start justify-between gap-4">
																	<div>
																		<p className="font-semibold text-gray-800">{subj.name}</p>
																		<p className="text-sm text-gray-500">{subj.description || 'No description'}</p>
																	</div>
																	<div className="text-right">
																		<p className="text-sm text-gray-700">Teacher</p>
																		<p className="font-medium text-gray-900">{subj.teacher?.name || 'N/A'}</p>
																		<p className="text-xs text-gray-500">{subj.teacher?.user?.email}</p>
																		<div className="mt-2 flex gap-2 justify-end">
																			<button
																				onClick={() => { setViewingSubject(subj); setError(''); }}
																				className="px-3 py-1 text-sm rounded bg-green-50 text-green-700 hover:bg-green-100"
																			>
																				View Lessons
																			</button>
																			<button
																				onClick={() => handleEditClick(subj)}
																				className="px-3 py-1 text-sm rounded bg-brand-50 text-brand-900 hover:bg-brand-50"
																			>
																				Edit
																			</button>
																			<button
																				onClick={() => handleDelete(subj._id)}
																				className="px-3 py-1 text-sm rounded bg-red-50 text-red-700 hover:bg-red-100"
																			>
																				Delete
																			</button>
																		</div>
																	</div>
																</div>
															))}
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{!viewingSubject && isSubjectModalOpen && (
							<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
								<div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-100 p-6 max-h-[90vh] overflow-y-auto">
									<div className="flex items-center justify-between mb-4">
										<h2 className="text-xl font-semibold text-gray-800">{editingId ? 'Edit Subject' : 'Create Subject'}</h2>
										<button
											type="button"
											onClick={() => {
												setIsSubjectModalOpen(false);
												setEditingId('');
												setSubjectForm({ name: '', stream: '', teacher: '', description: '' });
											}}
											className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
										>
											&times;
										</button>
									</div>

									<form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubjectSubmit}>
										<div className="md:col-span-2">
											<label className="block text-sm font-semibold text-gray-700 mb-2">Subject Name</label>
											<input
												type="text"
												value={subjectForm.name}
												onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
												required
												className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
												placeholder="Chemistry"
											/>
										</div>

										<div>
											<label className="block text-sm font-semibold text-gray-700 mb-2">Stream</label>
											<select
												value={subjectForm.stream}
												onChange={(e) => setSubjectForm({ ...subjectForm, stream: e.target.value })}
												required
												className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
											>
												<option value="">Select Stream</option>
												{streams.map((stream) => (
													<option key={stream._id} value={stream._id}>{stream.name}</option>
												))}
											</select>
										</div>

										<div>
											<label className="block text-sm font-semibold text-gray-700 mb-2">Assign Teacher</label>
											<select
												value={subjectForm.teacher}
												onChange={(e) => setSubjectForm({ ...subjectForm, teacher: e.target.value })}
												required
												className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
											>
												<option value="">Select Teacher</option>
												{teachers.map((teacher) => (
													<option key={teacher._id} value={teacher._id}>{teacher.name} ({teacher.user?.email})</option>
												))}
											</select>
										</div>

										<div className="md:col-span-2">
											<label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
											<textarea
												value={subjectForm.description}
												onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
												rows="3"
												className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
												placeholder="Brief about syllabus coverage"
											/>
										</div>

										<div className="md:col-span-2 flex justify-end gap-3 mt-2">
											<button
												type="button"
												onClick={() => {
													setIsSubjectModalOpen(false);
													setEditingId('');
													setSubjectForm({ name: '', stream: '', teacher: '', description: '' });
												}}
												className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
											>
												Cancel
											</button>
											<button type="submit" className="px-6 py-3 bg-brand-900 text-white rounded-lg hover:bg-green-700 transition">
												{editingId ? 'Update Subject' : 'Create Subject'}
											</button>
										</div>
									</form>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AdminCoursePortal;
