import { useEffect, useMemo, useState } from 'react';
import StudentNavbar from '../components/StudentNavbar';
import LessonView from '../components/LessonView';

const api = 'https://examcoach-backend-mnoy.onrender.com';

const CourseExplorer = () => {
	const [streams, setStreams] = useState([]);
	const [subjects, setSubjects] = useState([]);
	const [selectedStream, setSelectedStream] = useState('');
	const [selectedSubject, setSelectedSubject] = useState('');
	const [lessons, setLessons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const load = async () => {
			try {
				const [streamRes, subjectRes] = await Promise.all([
					fetch(`${api}/api/streams`),
					fetch(`${api}/api/subjects`)
				]);
				const [streamData, subjectData] = await Promise.all([streamRes.json(), subjectRes.json()]);
				if (!streamData.success) throw new Error(streamData.error || 'Failed to load streams');
				if (!subjectData.success) throw new Error(subjectData.error || 'Failed to load subjects');
				setStreams(streamData.data || []);
				setSubjects(subjectData.data || []);
				setError('');
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	useEffect(() => {
		if (!selectedSubject) {
			setLessons([]);
			return;
		}
		const fetchLessons = async () => {
			try {
				const res = await fetch(`${api}/api/subjects/${selectedSubject}/lessons`);
				const data = await res.json();
				if (!data.success) throw new Error(data.error || 'Failed to load lessons');
				setLessons(data.data || []);
			} catch (err) {
				setError(err.message);
			}
		};
		fetchLessons();
	}, [selectedSubject]);

	const filteredSubjects = useMemo(() => {
		if (!selectedStream) return [];
		return subjects.filter((s) => s.stream?._id === selectedStream);
	}, [subjects, selectedStream]);

	useEffect(() => {
		if (!selectedSubject) return;
		const currentSubj = filteredSubjects.find((s) => s._id === selectedSubject);
		if (!currentSubj) {
			setSelectedSubject('');
		}
	}, [filteredSubjects, selectedSubject]);

	return (
		<div className="min-h-screen bg-brand-50">
			<StudentNavbar />

			{/* Branded Page Header */}
			<div className="relative overflow-hidden bg-gradient-to-r from-brand-700 to-brand-900">
				<div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
				<div className="absolute bottom-0 left-0 w-56 h-56 bg-brand-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white shadow-lg">
							<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
							</svg>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-white">Course Explorer</h1>
							<p className="text-white/80 mt-1">Browse A/L streams, subjects, and lesson materials.</p>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-6 py-8">

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
						<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
							<div>
								<h3 className="text-sm font-semibold text-gray-700 mb-2">Select Stream</h3>
								<select
									value={selectedStream}
									onChange={(e) => {
										setSelectedStream(e.target.value);
										setSelectedSubject('');
									}}
									className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
								>
									<option value="" disabled>Select a stream</option>
									{streams.map((stream) => (
										<option key={stream._id} value={stream._id}>{stream.name}</option>
									))}
								</select>
							</div>

							<div>
								<h3 className="text-sm font-semibold text-gray-700 mb-2">Subjects</h3>
								<div className="space-y-2 max-h-80 overflow-y-auto pr-1">
									{filteredSubjects.map((subj) => (
										<button
											key={subj._id}
											onClick={() => setSelectedSubject(subj._id)}
											className={`w-full text-left px-3 py-2 rounded-lg border transition ${selectedSubject === subj._id ? 'border-brand-700 bg-brand-50 text-brand-900' : 'border-gray-200 hover:border-brand-300'}`}
										>
											<p className="font-semibold">{subj.name}</p>
											<p className="text-xs text-gray-500">{subj.teacher?.name}</p>
										</button>
									))}
									{!selectedStream && <p className="text-sm text-gray-500">Select a stream to view subjects.</p>}
									{selectedStream && !filteredSubjects.length && <p className="text-sm text-gray-500">No subjects in this stream.</p>}
								</div>
							</div>
						</div>

						<div className="lg:col-span-2">
							<LessonView lessons={lessons} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default CourseExplorer;
