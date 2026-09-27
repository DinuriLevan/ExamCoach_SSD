import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StudentLayout from '../layouts/StudentLayout';
import PageHeader from '../components/PageHeader';

const CreateStudyPlan = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        studyHoursPerDay: '',
        subjects: [] // Array of { name, examDate, isWeak, pdfFile, topics }
    });

    // Temp state for adding a subject
    const [currentSubject, setCurrentSubject] = useState({
        name: '',
        examDate: '',
        isWeak: false,
        pdfFile: null
    });

    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [extractedTopics, setExtractedTopics] = useState([]);
    const [ocrUsed, setOcrUsed] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if we're in edit mode (coming from edit button)
        if (location.state?.plan) {
            setIsEditMode(true);
            const { studyHoursPerDay, subjects } = location.state.plan;
            const formattedSubjects = subjects.map(s => ({
                name: s.name,
                examDate: new Date(s.examDate).toISOString().split('T')[0],
                isWeak: s.isWeak,
                topics: s.topics || []
            }));

            setFormData({
                studyHoursPerDay,
                subjects: formattedSubjects
            });
        }
    }, [location.state]);

    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file');
            return;
        }

        // Check file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            setError('PDF file is too large. Maximum size is 20MB.');
            return;
        }

        setCurrentSubject({ ...currentSubject, pdfFile: file });
        setUploadingPdf(true);
        setError('');
        setExtractedTopics([]);

        try {
            const formData = new FormData();
            formData.append('pdf', file);

            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan/extract-topics', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setExtractedTopics(data.topics || []);
                if (data.topics && data.topics.length > 0) {
                    setError(''); // Clear any previous errors
                    
                    // Show info if OCR was used
                    if (data.extractionMethod === 'ocr') {
                        setOcrUsed(true);
                        console.log('OCR was used to extract text from this PDF');
                    } else {
                        setOcrUsed(false);
                    }
                }
            } else {
                setError(data.error || 'Failed to extract topics from PDF');
                setExtractedTopics([]);
                setOcrUsed(false);
            }
        } catch (err) {
            console.error('PDF upload error:', err);
            setError('Failed to process PDF. Please check your connection and try again.');
            setExtractedTopics([]);
        } finally {
            setUploadingPdf(false);
        }
    };

    const handleAddSubject = (e) => {
        e.preventDefault();
        
        // Only allow up to 3 subjects
        if (formData.subjects.length >= 3) {
            setError('Maximum 3 subjects allowed. Please edit or delete existing subjects to add a new one.');
            return;
        }
        
        if (!currentSubject.name.trim() || !currentSubject.examDate) {
            setError('Please provide subject name and exam date');
            return;
        }

        const selectedDate = new Date(currentSubject.examDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            setError('Exam date cannot be in the past');
            return;
        }

        if (!currentSubject.pdfFile) {
            setError('Please upload a PDF file');
            return;
        }

        if (extractedTopics.length === 0) {
            setError('No topics extracted from PDF. Please upload a valid study material.');
            return;
        }

        setFormData({
            ...formData,
            subjects: [...formData.subjects, { 
                ...currentSubject, 
                name: currentSubject.name.trim(),
                topics: extractedTopics
            }]
        });

        // Reset current subject input
        setCurrentSubject({
            name: '',
            examDate: '',
            isWeak: false,
            pdfFile: null
        });
        setExtractedTopics([]);
        setError('');
    };

    const handleRemoveSubject = (subjectName) => {
        setFormData({
            ...formData,
            subjects: formData.subjects.filter(s => s.name !== subjectName)
        });
    };

    const handleEditSubject = (subject) => {
        setCurrentSubject({
            name: subject.name,
            examDate: new Date(subject.examDate).toISOString().split('T')[0],
            isWeak: subject.isWeak,
            pdfFile: subject.pdfFile || null
        });
        setExtractedTopics(subject.topics || []);
        handleRemoveSubject(subject.name);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (formData.subjects.length === 0) {
                setError('Please add at least one subject');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/study-plan', {
                method: isEditMode ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    studyHoursPerDay: Number(formData.studyHoursPerDay),
                    subjects: formData.subjects
                })
            });

            const data = await response.json();

            if (data.success) {
                // Navigate directly to timetable
                navigate('/student/timetable');
            } else {
                setError(data.error || `Failed to ${isEditMode ? 'update' : 'create'} plan`);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <StudentLayout
            header={
                <PageHeader
                    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    title={isEditMode ? 'Edit Study Plan' : 'Create Study Plan'}
                    subtitle={isEditMode ? 'Update your subjects and study preferences' : 'Set up your personalised AI-powered study schedule'}
                />
            }
        >

            <div className="max-w-4xl mx-auto mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Daily Hours Input */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Daily Study Hours
                            </label>
                            <input
                                type="number"
                                value={formData.studyHoursPerDay}
                                onChange={(e) => setFormData({ ...formData, studyHoursPerDay: e.target.value })}
                                required
                                min="1"
                                max="24"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent"
                                placeholder="e.g. 4"
                            />
                        </div>

                        {/* Add Subject Section - Show if less than 3 subjects */}
                        {formData.subjects.length < 3 && (
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                    Add Subject & Upload Study Material ({formData.subjects.length}/3)
                                </h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Subject Name</label>
                                        <input
                                            type="text"
                                            value={currentSubject.name}
                                            onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                                            placeholder="e.g., Mathematics"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Exam Date</label>
                                        <input
                                            type="date"
                                            min={new Date().toLocaleDateString('en-CA')}
                                            value={currentSubject.examDate}
                                            onChange={(e) => setCurrentSubject({ ...currentSubject, examDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="inline-flex items-center cursor-pointer pb-2">
                                            <input
                                                type="checkbox"
                                                checked={currentSubject.isWeak}
                                                onChange={(e) => setCurrentSubject({ ...currentSubject, isWeak: e.target.checked })}
                                                className="form-checkbox h-5 w-5 text-brand-700 rounded"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Weak Subject?</span>
                                        </label>
                                    </div>
                                </div>

                                {/* PDF Upload */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-2">Upload Study Material (PDF)</label>
                                    <div className="flex items-center gap-3">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-brand-700 transition-colors">
                                                <div className="flex items-center justify-center gap-2 text-gray-600">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    <span className="text-sm">
                                                        {currentSubject.pdfFile ? currentSubject.pdfFile.name : 'Click to upload PDF'}
                                                    </span>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handlePdfUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">
                                        💡 Tip: Works with both regular PDFs and scanned documents (OCR enabled). Max size: 20MB
                                    </p>
                                    {uploadingPdf && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-700"></div>
                                            <p className="text-sm text-brand-700">Extracting topics from PDF...</p>
                                        </div>
                                    )}
                                </div>

                                {/* Extracted Topics Display */}
                                {extractedTopics.length > 0 && (
                                    <div className="bg-white p-4 rounded-lg border border-green-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-semibold text-gray-700">Extracted Topics ({extractedTopics.length})</h4>
                                            {ocrUsed && (
                                                <span className="text-xs bg-brand-50 text-brand-900 px-2 py-1 rounded-full font-semibold">
                                                    📷 OCR Used
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {extractedTopics.map((topic, idx) => (
                                                <span key={idx} className="bg-brand-50 text-brand-900 text-xs px-3 py-1 rounded-full">
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                        {ocrUsed && (
                                            <p className="text-xs text-brand-700 mt-2">
                                                ℹ️ This PDF was processed using OCR (Optical Character Recognition) for scanned content
                                            </p>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleAddSubject}
                                    disabled={uploadingPdf}
                                    className="w-full bg-brand-700 text-white py-3 rounded-lg hover:bg-brand-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add Subject
                                </button>
                            </div>
                        </div>
                        )}

                        {/* Subject List */}
                        {formData.subjects.length > 0 && (
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-gray-700">Added Subjects:</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {formData.subjects.map((subject, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleEditSubject(subject)}
                                            className="flex items-center justify-between bg-white border border-gray-200 p-4 rounded-lg shadow-sm cursor-pointer hover:border-brand-700 transition-colors group"
                                            title="Click to edit"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`w-2 h-10 rounded-full ${subject.isWeak ? 'bg-red-500' : 'bg-brand-700'}`}></div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-gray-800 group-hover:text-brand-700">{subject.name}</h4>
                                                        {subject.isWeak && (
                                                            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-semibold">Weak Area</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">Exam: {new Date(subject.examDate).toLocaleDateString()}</p>
                                                    {subject.topics && subject.topics.length > 0 && (
                                                        <p className="text-xs text-brand-700 mt-1">{subject.topics.length} topics extracted</p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveSubject(subject.name);
                                                }}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-brand-700 to-brand-900 text-white font-bold py-3 px-6 rounded-lg hover:from-brand-900 hover:to-brand-900 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading 
                                ? (isEditMode ? 'Updating Plan...' : 'Generating Plan...') 
                                : (isEditMode ? 'Update My Plan' : 'Generate My Plan')
                            }
                        </button>
                    </form>
                </div>
            </div>
        </StudentLayout>
    );
};

export default CreateStudyPlan;
