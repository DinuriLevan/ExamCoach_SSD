import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'https://examcoach-backend-mnoy.onrender.com';

/**
 * CheatingAlert — Real-time cheating detection notification for teachers.
 * Place this component on any teacher page to receive alerts when students switch tabs.
 * It plays a beep sound and displays a toast notification.
 */
const CheatingAlert = () => {
    const [alerts, setAlerts] = useState([]);
    const socketRef = useRef(null);
    const audioContextRef = useRef(null);

    // Play a beep sound using Web Audio API (no external files needed)
    const playBeep = useCallback(() => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
            gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.5);

            // Second beep for urgency
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1100, ctx.currentTime);
                gain2.gain.setValueAtTime(0.5, ctx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc2.start(ctx.currentTime);
                osc2.stop(ctx.currentTime + 0.3);
            }, 200);
        } catch (err) {
            console.warn('Could not play beep:', err);
        }
    }, []);

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Teacher monitor connected:', socket.id);
            // Join global teacher monitor room
            socket.emit('join-teacher-monitor', { role: 'teacher' });
        });

        // Listen for tab-switch cheating events
        socket.on('student-tab-switch', (data) => {
            console.log('🚨 Cheating alert received:', data);

            // Play beep sound
            playBeep();

            // Add alert to the list
            const alert = {
                id: Date.now() + Math.random(),
                studentName: data.studentName || 'Unknown',
                quizTitle: data.quizTitle || 'Unknown Quiz',
                switchCount: data.switchCount || 1,
                timestamp: data.timestamp || new Date().toISOString(),
            };

            setAlerts(prev => [alert, ...prev].slice(0, 20)); // Keep last 20 alerts

            // Auto-remove alert after 15 seconds
            setTimeout(() => {
                setAlerts(prev => prev.filter(a => a.id !== alert.id));
            }, 15000);
        });

        return () => {
            socket.disconnect();
        };
    }, [playBeep]);

    const dismissAlert = (alertId) => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    if (alerts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className="bg-red-600 text-white rounded-xl shadow-2xl p-4 animate-bounce-in border-2 border-red-400"
                    style={{ animation: 'slideInRight 0.3s ease-out, pulse 2s ease-in-out 0.3s 3' }}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🚨</span>
                            <div>
                                <p className="font-bold text-sm">Cheating Detected!</p>
                                <p className="text-sm opacity-95">
                                    <span className="font-semibold">{alert.studentName}</span> switched tabs
                                </p>
                                <p className="text-xs opacity-80 mt-0.5">
                                    Quiz: {alert.quizTitle} • Tab switches: {alert.switchCount}
                                </p>
                                <p className="text-xs opacity-60 mt-0.5">
                                    {new Date(alert.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => dismissAlert(alert.id)}
                            className="text-white/70 hover:text-white text-lg leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}

            {/* Inline CSS for animation (no external CSS needed) */}
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.85; }
                }
            `}</style>
        </div>
    );
};

export default CheatingAlert;
