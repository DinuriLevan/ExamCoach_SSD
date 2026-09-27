import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const Login = () => {
    // Step 1: Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Step 2: OTP Verification (if required)
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState('');
    const [userId, setUserId] = useState(null);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await authAPI.login({ email, password });

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect based on role
                if (data.user.role === 'admin') {
                    navigate('/admin/dashboard');
                } else if (data.user.role === 'teacher') {
                    navigate('/teacher/dashboard');
                } else {
                    navigate('/student/home');
                }
            } else {
                if (data.requiresVerification) {
                    setUserId(data.userId);
                    setStep(2);
                    setError(data.error); // Show the "new OTP sent" message
                } else {
                    setError(data.error);
                }
            }
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/auth/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, otp })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Usually only students do this self-verification, but generalize redirect
                if (data.user.role === 'admin') {
                    navigate('/admin/dashboard');
                } else if (data.user.role === 'teacher') {
                    navigate('/teacher/dashboard');
                } else {
                    navigate('/student/home');
                }
            } else {
                setError(data.error || 'Invalid OTP');
            }
        } catch (err) {
            setError('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex justify-center items-center p-4 overflow-hidden bg-brand-50">
            {/* Animated Ambient Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-brand-900/30 to-brand-300/30 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-brand-700/20 to-brand-50/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Glassmorphic Form Container */}
            <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 text-white shadow-lg mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                        {step === 1 ? 'Welcome Back' : 'Verify Email'}
                    </h2>
                    <p className="text-gray-500 font-medium">
                        {step === 1 ? 'Login to your ExamCoach account' : 'Enter the OTP to verify your account'}
                    </p>
                </div>

                {error && (
                    <div className={`bg-red-50/80 backdrop-blur-sm border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-6 shadow-sm ${step === 1 ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                        <p className="font-semibold text-sm">{error}</p>
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-brand-700 focus:bg-white transition-all outline-none font-medium text-gray-800 placeholder-gray-400"
                                placeholder="your.email@example.com"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-gray-700">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-sm text-brand-700 hover:text-brand-900 font-bold transition-colors">
                                    Forgot Password?
                                </Link>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:border-brand-700 focus:bg-white transition-all outline-none font-medium text-gray-800 placeholder-gray-400"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gradient-to-r from-brand-700 to-brand-900 text-white font-bold py-3.5 px-4 rounded-xl hover:from-brand-900 hover:to-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 transform transition-all mt-8 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-lg active:scale-95'}`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In to Dashboard'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleOTPSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-4 text-center">
                                A 6-digit code has been sent to your email
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength="6"
                                className="w-full text-center tracking-[1em] font-mono text-3xl px-4 py-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-700 focus:bg-white transition-all outline-none text-gray-800 shadow-inner"
                                placeholder="------"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gradient-to-r from-brand-700 to-brand-900 text-white font-bold py-3.5 px-4 rounded-xl hover:from-brand-900 hover:to-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 transform transition-all mt-8 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-lg active:scale-95'}`}
                        >
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                    </form>
                )}

                {step === 1 && (
                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-gray-500 font-medium">
                            Don't have an account?{' '}
                            <Link
                                to="/register"
                                className="text-brand-700 hover:text-brand-900 font-bold transition-colors"
                            >
                                Register now
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
