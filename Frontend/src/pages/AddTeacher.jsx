import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import PageHeader from '../components/PageHeader';

const AddTeacher = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        address: '',
        contactNo: '',
        nic: '',
        experience: '',
        qualification: '',
        subject: '',
        gender: '',
        dob: ''
    });
    const [profilePic, setProfilePic] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setProfilePic(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const data = new FormData();

            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });

            if (profilePic) {
                data.append('profilePic', profilePic);
            }

            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/auth/add-teacher', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: data
            });
            const resData = await response.json();

            if (resData.success) {
                navigate('/admin/teachers');
            } else {
                setError(resData.error || 'Failed to add teacher');
            }
        } catch (err) {
            setError('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-brand-50">
            <Sidebar role="admin" />
            <div className="flex-1 ml-64 bg-brand-50 pb-12">
                <TopNavbar role="admin" pageName="Add New Teacher" />
                <PageHeader 
                    icon="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    title="Add New Teacher"
                    subtitle="Fill in the details to register a new teacher"
                >
                    <Link
                        to="/admin/teachers"
                        className="px-6 py-2.5 bg-white/20 text-white rounded-xl shadow-md font-semibold hover:bg-white/30 transition-all whitespace-nowrap border border-white/30"
                    >
                        ← Back to List
                    </Link>
                </PageHeader>
                <div className="p-8">
                    <div className="max-w-5xl mx-auto relative z-10 -mt-8">

                        <div className="bg-white rounded-xl shadow-lg p-8">
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-6">
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Personal Information */}
                                <div className="border-b border-gray-200 pb-6">
                                    <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                        <span className="text-2xl">👤</span>
                                        Personal Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Profile Picture
                                            </label>
                                            <input
                                                type="file"
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-900 hover:file:bg-brand-50"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                placeholder="John Doe"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Email *
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                placeholder="john@example.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Password *
                                            </label>
                                            <input
                                                type="password"
                                                name="password"
                                                onChange={handleChange}
                                                required
                                                minLength="6"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                placeholder="Min. 6 characters"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Date of Birth *
                                            </label>
                                            <input
                                                type="date"
                                                name="dob"
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Gender *
                                            </label>
                                            <select
                                                name="gender"
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Contact Number *
                                            </label>
                                            <input
                                                type="tel"
                                                name="contactNo"
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                placeholder="+94 77 123 4567"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                NIC *
                                            </label>
                                            <input
                                                type="text"
                                                name="nic"
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                placeholder="123456789V"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Address *
                                            </label>
                                            <textarea
                                                name="address"
                                                onChange={handleChange}
                                                required
                                                rows="3"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                placeholder="Full address with city and postal code"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Information */}
                                <div className="pb-6">
                                    <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                        <span className="text-2xl">🎓</span>
                                        Professional Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Subject *
                                            </label>
                                            <input
                                                type="text"
                                                name="subject"
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                placeholder="Mathematics, Science, etc."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Qualification *
                                            </label>
                                            <input
                                                type="text"
                                                name="qualification"
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                placeholder="B.Sc, M.Sc, Ph.D, etc."
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Experience *
                                            </label>
                                            <input
                                                type="text"
                                                name="experience"
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent outline-none"
                                                placeholder="5 years teaching experience at ABC School"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/admin/teachers')}
                                        className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-3 bg-gradient-to-r from-brand-700 to-brand-900 text-white font-medium rounded-lg hover:from-brand-700 hover:to-brand-900 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Adding...
                                            </span>
                                        ) : (
                                            'Add Teacher'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddTeacher;
