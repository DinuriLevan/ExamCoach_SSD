import { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage('An email has been sent with instructions to reset your password.');
            } else {
                setError(data.error || 'Failed to send reset email');
            }
        } catch (err) {
            setError('Something went wrong. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-5 bg-gradient-to-br from-brand-50 to-brand-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</h2>
                    <p className="text-gray-600">Enter your email to receive a reset link</p>
                </div>

                {message && (
                    <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-xl mb-6">
                        <p className="font-medium">{message}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-6 animate-shake">
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-transparent transition-all outline-none"
                            placeholder="your.email@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-gradient-to-r from-brand-700 to-brand-900 text-white font-semibold py-3 px-4 rounded-lg hover:from-brand-700 hover:to-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 transform transition-all hover:scale-105 active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <p className="mt-6 text-center text-gray-600">
                    Remembered your password?{' '}
                    <Link
                        to="/login"
                        className="text-brand-700 hover:text-brand-900 font-semibold transition-colors"
                    >
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
