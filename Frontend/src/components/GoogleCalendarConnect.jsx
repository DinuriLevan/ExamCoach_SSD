import React, { useState, useEffect } from 'react';

const GoogleCalendarConnect = ({ studentId, studyPlanId }) => {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        checkConnectionStatus();
    }, []);

    const checkConnectionStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/calendar/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setConnected(data.connected);
            }
        } catch (error) {
            console.error('Error checking calendar status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const token = localStorage.getItem('token');

            // Get student ID from user data
            const user = JSON.parse(localStorage.getItem('user'));
            const currentStudentId = studentId || user?.studentId || user?.profile?._id;

            if (!currentStudentId) {
                alert('Student information not found. Please log in again.');
                return;
            }

            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/calendar/auth', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Add student ID as state parameter
                const authUrlWithState = `${data.authUrl}&state=${currentStudentId}`;
                window.location.href = authUrlWithState;
            }
        } catch (error) {
            console.error('Error initiating calendar connection:', error);
            alert('Failed to connect to Google Calendar');
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect Google Calendar?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://examcoach-backend-mnoy.onrender.com/api/calendar/disconnect', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setConnected(false);
                alert('Google Calendar disconnected successfully');
            }
        } catch (error) {
            console.error('Error disconnecting calendar:', error);
            alert('Failed to disconnect Google Calendar');
        }
    };

    const handleManualSync = async (studyPlanId) => {
        if (!studyPlanId) {
            alert('No study plan found to sync');
            return;
        }

        setSyncing(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://examcoach-backend-mnoy.onrender.com/api/calendar/sync/${studyPlanId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ ${data.message}\n${data.eventsCreated} events created`);
            } else {
                const error = await response.json();
                alert(`Failed to sync: ${error.message}`);
            }
        } catch (error) {
            console.error('Error syncing to calendar:', error);
            alert('Failed to sync to Google Calendar');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="calendar-connect-container">
                <p>Loading calendar status...</p>
            </div>
        );
    }

    return (
        <div className="calendar-connect-container" style={styles.container}>
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="24" height="24" viewBox="0 0 40 40">
                        <path d="M25 5H10C7.23858 5 5 7.23858 5 10V25C5 27.7614 7.23858 30 10 30H25C27.7614 30 30 27.7614 30 25V10C30 7.23858 27.7614 5 25 5Z" fill="white" />
                        <path d="M30 15V10C30 7.23858 27.7614 5 25 5H20V15H30Z" fill="#EA4335" />
                        <path d="M20 5H10C7.23858 5 5 7.23858 5 10V15H20V5Z" fill="#4285F4" />
                        <path d="M5 15V25C5 27.7614 7.23858 30 10 30H15V15H5Z" fill="#FBBC05" />
                        <path d="M15 30H25C27.7614 30 30 27.7614 30 25V15H15V30Z" fill="#34A853" />
                        <path d="M11 25.5V13H13.2V23.5H18.5V25.5H11Z" fill="#3c4043" />
                    </svg>
                    <h3 style={styles.title}>Google Calendar</h3>
                </div>
                {connected && (
                    <span style={styles.badge}>✓ Connected</span>
                )}
            </div>

            {!connected ? (
                <div style={styles.content}>
                    <p style={styles.description}>
                        Connect your Google Calendar to automatically sync your exam dates and study sessions.
                    </p>
                    <button
                        onClick={handleConnect}
                        style={styles.connectButton}
                    >
                        Connect
                    </button>
                </div>
            ) : (
                <div style={styles.content}>
                    <p style={styles.description}>
                        Your study plan is synced with Google Calendar. Exam dates and study sessions are automatically added.
                    </p>
                    <div style={styles.buttonGroup}>
                        <button
                            onClick={() => handleManualSync(studyPlanId)}
                            disabled={syncing}
                            style={syncing ? { ...styles.syncButton, opacity: 0.7, cursor: 'not-allowed' } : styles.syncButton}
                        >
                            {syncing ? 'Syncing...' : 'Sync to Calendar'}
                        </button>
                        <button
                            onClick={handleDisconnect}
                            style={styles.disconnectButton}
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '20px',
        marginBottom: '20px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
    },
    title: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: '#333'
    },
    badge: {
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500'
    },
    content: {
        marginTop: '10px'
    },
    description: {
        color: '#666',
        fontSize: '14px',
        marginBottom: '15px',
        lineHeight: '1.5'
    },
    connectButton: {
        backgroundColor: '#4285F4',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px'
    },
    disconnectButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.3s'
    },
    syncButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.3s'
    }
};

export default GoogleCalendarConnect;
