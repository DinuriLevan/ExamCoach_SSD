import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CalendarCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Processing Google Calendar connection...');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const success = params.get('success');
        const error = params.get('error');

        if (success === 'true') {
            setStatus('success');
            setMessage('✅ Google Calendar connected successfully!');
            setTimeout(() => {
                navigate('/student/view-plan');
            }, 2000);
        } else if (error) {
            setStatus('error');
            let errorMessage = 'Failed to connect Google Calendar. ';

            switch (error) {
                case 'no_code':
                    errorMessage += 'Authorization code not received.';
                    break;
                case 'no_student':
                    errorMessage += 'Student information not found.';
                    break;
                case 'student_not_found':
                    errorMessage += 'Student account not found.';
                    break;
                case 'auth_failed':
                    errorMessage += 'Authentication failed.';
                    break;
                default:
                    errorMessage += 'Unknown error occurred.';
            }

            setMessage(errorMessage);
            setTimeout(() => {
                navigate('/student/view-plan');
            }, 3000);
        }
    }, [location, navigate]);

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {status === 'processing' && (
                    <div style={styles.spinner}></div>
                )}
                {status === 'success' && (
                    <div style={styles.successIcon}>✓</div>
                )}
                {status === 'error' && (
                    <div style={styles.errorIcon}>✗</div>
                )}
                <h2 style={styles.title}>{message}</h2>
                <p style={styles.subtitle}>Redirecting you back...</p>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
    },
    card: {
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '500px'
    },
    spinner: {
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #4285F4',
        borderRadius: '50%',
        width: '50px',
        height: '50px',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
    },
    successIcon: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#4CAF50',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '36px',
        margin: '0 auto 20px',
        fontWeight: 'bold'
    },
    errorIcon: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#dc3545',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '36px',
        margin: '0 auto 20px',
        fontWeight: 'bold'
    },
    title: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '10px'
    },
    subtitle: {
        fontSize: '14px',
        color: '#666'
    }
};

// Add keyframes for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default CalendarCallback;
