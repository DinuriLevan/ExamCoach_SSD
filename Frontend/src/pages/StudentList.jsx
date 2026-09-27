import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';

const StudentList = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/students', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setStudents(data.data);
            } else {
                setError('Failed to fetch students');
            }
        } catch (err) {
            setError('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentDetails = async (studentId) => {
        setLoadingDetails(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://examcoach-backend-mnoy.onrender.com/api/students/${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setSelectedStudent(data.data);
                setShowModal(true);
            }
        } catch (err) {
            console.error('Error fetching student details:', err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleRowClick = (studentId) => {
        fetchStudentDetails(studentId);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedStudent(null);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation(); // Prevent row click when clicking delete
        if (window.confirm('Are you sure you want to delete this student?')) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://examcoach-backend-mnoy.onrender.com/api/students/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    setStudents(students.filter(student => student._id !== id));
                    if (selectedStudent?._id === id) {
                        closeModal();
                    }
                } else {
                    alert('Failed to delete student');
                }
            } catch (err) {
                alert('Error deleting student');
            }
        }
    };

    return (
        <div className="flex min-h-screen bg-brand-50">
            <Sidebar role="admin" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="admin" pageName="Manage Students" />
                <PageHeader 
                    icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    title="Manage Students"
                    subtitle="View and manage all registered students. Click on a row to view details."
                />
                <div className="p-8">
                    <div className="max-w-7xl mx-auto relative z-10 -mt-8">

                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md">
                                <p className="font-medium">{error}</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Profile</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">DOB</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Gender</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {students.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                            </svg>
                                                            <p className="text-gray-500 font-medium">No students registered yet</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                students.map(student => (
                                                    <tr
                                                        key={student._id}
                                                        onClick={() => handleRowClick(student._id)}
                                                        className="hover:bg-brand-50 transition-colors cursor-pointer"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm">
                                                                {student.profilePic ? (
                                                                    <img
                                                                        src={student.profilePic}
                                                                        alt="Profile"
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center text-white font-bold">
                                                                        {student.firstName?.charAt(0)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="font-medium text-gray-900">
                                                                {student.firstName} {student.lastName}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-gray-600">{student.user?.email || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                            {student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.gender === 'Male' ? 'bg-brand-50 text-brand-900' :
                                                                student.gender === 'Female' ? 'bg-brand-50 text-brand-900' :
                                                                    'bg-brand-50 text-brand-900'
                                                                }`}>
                                                                {student.gender || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <button
                                                                onClick={(e) => handleDelete(student._id, e)}
                                                                className="bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 transition-colors shadow-sm"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Student Details Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {loadingDetails ? (
                            <div className="flex justify-center items-center p-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
                            </div>
                        ) : selectedStudent && (
                            <>
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-brand-700 to-brand-900 p-6 text-white relative">
                                    <button
                                        onClick={closeModal}
                                        className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                                            {selectedStudent.profilePic ? (
                                                <img src={selectedStudent.profilePic} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-white bg-opacity-20 flex items-center justify-center text-3xl font-bold">
                                                    {selectedStudent.firstName?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                                            <p className="text-brand-50 mt-1">{selectedStudent.user?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Body */}
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Personal Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-500">Full Name</p>
                                            <p className="text-base text-gray-900">{selectedStudent.user?.name || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-500">Email Address</p>
                                            <p className="text-base text-gray-900">{selectedStudent.user?.email || 'Not set'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-500">First Name</p>
                                            <p className="text-base text-gray-900">{selectedStudent.firstName || 'Not set'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-500">Last Name</p>
                                            <p className="text-base text-gray-900">{selectedStudent.lastName || 'Not set'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                                            <p className="text-base text-gray-900">
                                                {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) : 'Not set'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-500">Gender</p>
                                            <p className="text-base text-gray-900">{selectedStudent.gender || 'Not set'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-500">Phone Number</p>
                                            <p className="text-base text-gray-900">{selectedStudent.phone || 'Not set'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-500">User ID</p>
                                            <p className="text-base text-gray-900 font-mono text-sm">{selectedStudent._id}</p>
                                        </div>
                                        {selectedStudent.address && (
                                            <div className="space-y-1 md:col-span-2">
                                                <p className="text-sm font-medium text-gray-500">Address</p>
                                                <p className="text-base text-gray-900">{selectedStudent.address}</p>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-500">Registered On</p>
                                            <p className="text-base text-gray-900">
                                                {selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) : 'Not available'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                                    <button
                                        onClick={(e) => handleDelete(selectedStudent._id, e)}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Student
                                    </button>
                                    <button
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentList;
