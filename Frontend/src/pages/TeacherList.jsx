import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';

const TeacherList = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    const navigate = useNavigate();

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/teachers', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setTeachers(data.data);
            } else {
                setError('Failed to fetch teachers');
            }
        } catch (err) {
            setError('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this teacher?')) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://examcoach-backend-mnoy.onrender.com/api/teachers/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    setTeachers(teachers.filter(teacher => teacher._id !== id));
                    if (selectedTeacher && selectedTeacher._id === id) {
                        closeModal();
                    }
                } else {
                    alert('Failed to delete teacher');
                }
            } catch (err) {
                alert('Error deleting teacher');
            }
        }
    };

    const handleRowClick = (teacher) => {
        setSelectedTeacher(teacher);
        setEditFormData({
            name: teacher.name || '',
            email: teacher.user?.email || '',
            subject: teacher.subject || '',
            contactNo: teacher.contactNo || '',
            address: teacher.address || '',
            qualification: teacher.qualification || '',
            experience: teacher.experience || '',
            gender: teacher.gender || '',
            nic: teacher.nic || '',
            dob: teacher.dob ? new Date(teacher.dob).toISOString().split('T')[0] : ''
        });
        setIsModalOpen(true);
        setIsEditing(false);
    };

    const handleEditClick = (teacher, e) => {
        e.stopPropagation();
        handleRowClick(teacher);
        setIsEditing(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedTeacher(null);
        setIsEditing(false);
    };

    const handleEditChange = (e) => {
        setEditFormData({
            ...editFormData,
            [e.target.name]: e.target.value
        });
    };

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://examcoach-backend-mnoy.onrender.com/api/teachers/${selectedTeacher._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editFormData)
            });
            const data = await response.json();
            if (data.success) {
                const updatedTeacher = data.data;
                const newTeachers = teachers.map(t => {
                    if (t._id === selectedTeacher._id) {
                        return {
                            ...t,
                            ...updatedTeacher,
                            user: { ...t.user, email: editFormData.email }
                        };
                    }
                    return t;
                });

                setTeachers(newTeachers);
                setSelectedTeacher({
                    ...selectedTeacher,
                    ...updatedTeacher,
                    user: { ...selectedTeacher.user, email: editFormData.email }
                });

                setIsEditing(false);
                alert('Teacher updated successfully');
            } else {
                alert(data.error || 'Update failed');
            }
        } catch (err) {
            alert('Error updating teacher');
        }
    };

    const getProfilePicUrl = (picPath) => {
        if (!picPath) return null;
        if (picPath.startsWith('http')) return picPath;
        return `https://examcoach-backend-mnoy.onrender.com/${picPath}`;
    };

    return (
        <div className="flex min-h-screen bg-brand-50">
            <Sidebar role="admin" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="admin" pageName="Manage Teachers" />
                <PageHeader 
                    icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    title="Manage Teachers"
                    subtitle="View and manage all teachers"
                >
                    <Link
                        to="/admin/add-teacher"
                        className="bg-white text-brand-800 font-semibold py-2.5 px-6 rounded-xl shadow-md hover:bg-brand-50 transition-all whitespace-nowrap flex items-center gap-2"
                    >
                        + Add New Teacher
                    </Link>
                </PageHeader>
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
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subject</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {teachers.map(teacher => (
                                                <tr
                                                    key={teacher._id}
                                                    onClick={() => handleRowClick(teacher)}
                                                    className="hover:bg-brand-50 cursor-pointer transition-colors"
                                                    title="Click to view details"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-medium text-gray-900">{teacher.name}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-gray-600">{teacher.user?.email || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-50 text-brand-900">
                                                            {teacher.subject}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                        {teacher.contactNo}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                        <button
                                                            onClick={(e) => handleEditClick(teacher, e)}
                                                            className="bg-brand-700 text-white px-3 py-1.5 rounded-md hover:bg-brand-700 transition-colors shadow-sm"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(teacher._id, e)}
                                                            className="bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 transition-colors shadow-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Teacher Details Modal */}
                {isModalOpen && selectedTeacher && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={closeModal}>
                        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center rounded-t-2xl">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {isEditing ? '✏️ Edit Teacher' : '👤 Teacher Details'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-red-500 text-3xl font-light transition-colors"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="px-8 py-6">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={editFormData.name}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={editFormData.email}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                                                <input
                                                    type="text"
                                                    name="subject"
                                                    value={editFormData.subject}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact No</label>
                                                <input
                                                    type="text"
                                                    name="contactNo"
                                                    value={editFormData.contactNo}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    name="dob"
                                                    value={editFormData.dob}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                                                <select
                                                    name="gender"
                                                    value={editFormData.gender}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                                            <textarea
                                                name="address"
                                                value={editFormData.address}
                                                onChange={handleEditChange}
                                                required
                                                rows="3"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Qualification</label>
                                                <input
                                                    type="text"
                                                    name="qualification"
                                                    value={editFormData.qualification}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Experience</label>
                                                <input
                                                    type="text"
                                                    name="experience"
                                                    value={editFormData.experience}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">NIC</label>
                                                <input
                                                    type="text"
                                                    name="nic"
                                                    value={editFormData.nic}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-center mb-6">
                                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-brand-50 mx-auto shadow-lg">
                                                {selectedTeacher.profilePic ? (
                                                    <img
                                                        src={getProfilePicUrl(selectedTeacher.profilePic)}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center text-white text-4xl font-bold">
                                                        {selectedTeacher.name?.charAt(0) || 'T'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Name</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.name}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Email</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.user?.email || editFormData.email}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Subject</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.subject}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Contact</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.contactNo}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">DOB</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.dob ? new Date(selectedTeacher.dob).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Gender</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.gender}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Address</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.address}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Qualification</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.qualification}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Experience</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.experience}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                                <p className="text-xs uppercase font-semibold text-gray-500 mb-1">NIC</p>
                                                <p className="text-gray-900 font-medium">{selectedTeacher.nic}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex justify-end gap-3 rounded-b-2xl">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpdate}
                                            className="px-6 py-2 bg-gradient-to-r from-brand-700 to-brand-900 text-white font-medium rounded-lg hover:from-brand-700 hover:to-brand-900 transition-all shadow-md"
                                        >
                                            Save Changes
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={closeModal}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-6 py-2 bg-gradient-to-r from-brand-700 to-brand-900 text-white font-medium rounded-lg hover:from-brand-700 hover:to-brand-900 transition-all shadow-md"
                                        >
                                            Edit Details
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherList;
