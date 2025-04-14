"use client";
import { useEffect, useState, useRef } from 'react';
import { SnackbarProvider, enqueueSnackbar } from "notistack";
import { useRouter } from 'next/navigation';
export default function EnhancedSelfDestructPage() {

    // IMPORTANT: Replace with a secure, ideally environment-variable-sourced, password
    const correctPassword = process.env.NEXT_PUBLIC_SELF_DESTRUCT_PASSWORD || 'harrypotter';

    // --- State ---
    const router = useRouter();
    const [initialDuration] = useState(20); // Duration in seconds
    const [timeLeft, setTimeLeft] = useState(initialDuration);
    const [stopped, setStopped] = useState(false);
    const [destructed, setDestructed] = useState(false);
    const [password, setPassword] = useState('');
    const intervalRef = useRef(null);
    const hasTriggeredDestruct = useRef(false); // Prevent multiple triggers

    // --- Effects ---

    // Timer Effect
    useEffect(() => {
        if (stopped || destructed) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    if (!stopped && !hasTriggeredDestruct.current) {
                        triggerSelfDestruct();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [stopped, destructed]); // Re-run effect if stopped or destructed state changes

    // **** NEW: Prevent Page Unload Effect ****
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            // Only show the warning if the countdown is active
            if (!stopped && !destructed && timeLeft > 0) {
                // Standard way to trigger the browser's confirmation dialog
                event.preventDefault();
                // Required for older browsers (and Chrome)
                event.returnValue = '';
                // Modern browsers largely ignore custom messages here
                // return "Are you sure you want to leave? The sequence is still active!";
            }
            // If stopped or destructed, do nothing, allow unload.
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup: remove the listener when the component unmounts
        // or when stopped/destructed state changes (re-evaluation needed)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [stopped, destructed, timeLeft]); // Depend on state to enable/disable the warning correctly
    // *****************************************

    // --- Functions ---
    const triggerSelfDestruct = async () => {
        if (hasTriggeredDestruct.current) return;
        hasTriggeredDestruct.current = true;
        setDestructed(true);
        setTimeLeft(0);
        console.log('!!! SELF-DESTRUCT SEQUENCE COMPLETED !!!');
        // TODO: Implement actual API call or destructive action here
        try {
            // Store completion status in localStorage
            const completionTime = new Date().toISOString();
            const destructDetails = {
                completed: true,
                timestamp: completionTime,
                reason: 'Timer expired'
            };
            localStorage.setItem('selfDestructDetails', JSON.stringify(destructDetails));
            console.log('Self-destruct status saved to localStorage.');
            router.push('/admin');

        } catch (error) {
            console.error('Failed to write self-destruct status to localStorage:', error);
        }
    };

    const handleStopAttempt = (event) => {
        if (event && event.key && event.key !== 'Enter') {
            return;
        }
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        if (password.trim() === correctPassword) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setStopped(true);
            console.log('Countdown successfully aborted by user.');
            try {
                // Clear any destruction markers if aborted
                localStorage.removeItem('selfDestructDetails');
                localStorage.removeItem('selfDestructCompleted');
                localStorage.removeItem('selfDestructTimestamp');
                console.log('Cleared potential self-destruct markers from localStorage.');
            } catch (error) {
                console.log('Error clearing localStorage on abort:', error);
            }
            // Optionally clear password field after success
            // setPassword('');
        } else {
            enqueueSnackbar("ACCESS DENIED: Incorrect Deactivation Code!", { variant: "error" });
            setPassword(''); // Clear password on failure
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // --- Dynamic Styling ---
    const getTimerColor = () => {
        const percentage = (timeLeft / initialDuration) * 100;
        if (timeLeft <= 0 && !stopped) return 'text-red-600'; // Red when destructed or timer hits 0
        if (stopped) return 'text-green-500'; // Green when stopped
        if (percentage <= 10) return 'text-red-500 animate-pulse';
        if (percentage <= 30) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getBackgroundColor = () => {
        if (destructed) return 'bg-red-900';
        if (stopped) return 'bg-gray-900'; // Changed to a more neutral 'stopped' color

        const percentageLeft = Math.max(0, timeLeft / initialDuration); // Ensure percentage doesn't go below 0
        // Starts dark (near black) and intensifies towards red as time runs out
        const redIntensity = Math.min(255, Math.floor((1 - percentageLeft) * 150)); // Max 150 for a darker red
        const greenBlueIntensity = Math.max(0, Math.floor(percentageLeft * 20)); // Keep it darker
        return `rgba(${redIntensity}, ${greenBlueIntensity}, ${greenBlueIntensity}, 1)`;
    };

    const progressPercentage = stopped ? 0 : Math.max(0, (timeLeft / initialDuration) * 100); // Ensure progress doesn't go below 0

    // --- Render Logic ---
    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 transition-colors duration-1000"
            style={{ backgroundColor: getBackgroundColor() }} // Apply dynamic background
        >
            <div className="bg-black bg-opacity-60 border-2 border-gray-700 rounded-lg shadow-xl p-6 md:p-10 text-center font-mono max-w-2xl w-full">

                {/* State: Destructed */}
                {destructed && (
                    <div className="text-red-500">
                        <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-pulse">SYSTEM OFFLINE</h1>
                        <p className="text-2xl md:text-3xl mb-6">SELF-DESTRUCT COMPLETE</p>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <p className="mt-6 text-gray-400 text-sm">All operations terminated.</p>
                    </div>
                )}

                {/* State: Stopped */}
                {stopped && !destructed && (
                    <div className="text-green-500">
                        <h1 className="text-3xl md:text-5xl font-bold mb-4">SEQUENCE ABORTED</h1>
                        <p className="text-xl md:text-2xl mb-6">System Deactivation Confirmed.</p>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-green-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="mt-6 text-gray-300 text-sm">Countdown halted. Systems returning to normal.</p>
                    </div>
                )}

                {/* State: Countdown Running */}
                {!stopped && !destructed && (
                    <>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-red-500 animate-pulse">
                            <span className="text-yellow-400 mr-2">⚠️</span> EMERGENCY ALERT
                        </h1>
                        <p className="text-lg md:text-xl text-gray-300 mb-6">Self-Destruct Sequence Initiated</p>

                        {/* Timer Display */}
                        <div className={`text-6xl md:text-8xl font-black my-6 transition-colors duration-500 ${getTimerColor()}`}>
                            {formatTime(timeLeft)}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-700 rounded h-4 mb-8 overflow-hidden border border-gray-600">
                            <div
                                className={`h-full rounded transition-all duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-gradient-to-r from-red-700 to-red-500' : 'bg-gradient-to-r from-red-600 to-yellow-500'}`}
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>

                        {/* Deactivation Controls */}
                        <div className="mt-6">
                            <label htmlFor="passwordInput" className="block text-sm text-yellow-400 mb-2">DEACTIVATION CODE REQUIRED:</label>
                            <input
                                id="passwordInput"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={handleStopAttempt} // Allow Enter key
                                placeholder="Enter code..."
                                className="bg-gray-800 border border-gray-600 text-white px-4 py-2 rounded mb-3 w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label="Deactivation Code Input"
                                disabled={stopped || destructed} // Disable input when not running
                            />
                            <button
                                onClick={() => handleStopAttempt(null)} // Pass null for click events
                                className="bg-red-600 hover:bg-red-800 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold px-6 py-2 rounded transition-colors duration-200 w-full md:w-auto md:ml-2"
                                aria-label="Attempt Deactivation"
                                disabled={stopped || destructed} // Disable button when not running
                            >
                                ABORT SEQUENCE
                            </button>
                        </div>
                        <p className="mt-4 text-xs text-gray-500">Warning: Failure to provide the correct code will result in system destruction.</p>
                    </>
                )}
            </div>
            {/* SnackbarProvider should ideally wrap your entire app or layout,
                 but placing it here works for a single page example. */}
            <SnackbarProvider
                maxSnack={3}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            />
        </div>
    );
}