import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../ui/Spinner';
import { Lock, KeyRound, ArrowLeft, ShieldAlert, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

// Master Security Configuration
const MASTER_PIN = '998877';
const MASTER_SESSION_KEY = 'emakan_master_authenticated_session';
const STORAGE_KEY_ATTEMPTS = 'emakan_master_failed_attempts';
const STORAGE_KEY_LOCKOUT = 'emakan_master_lockout_until';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 Menit = 900.000 ms

function getStoredAttempts() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
        return saved ? Number(saved) : 0;
    } catch {
        return 0;
    }
}

function getStoredLockout() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_LOCKOUT);
        if (!saved) return 0;
        const time = Number(saved);
        return time > Date.now() ? time : 0;
    } catch {
        return 0;
    }
}

function getRemainingSeconds(targetTime) {
    if (!targetTime) return 0;
    const diff = targetTime - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
}

function formatLockoutTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function MasterRoute({ children }) {
    const { user, userData, loading } = useAuth();
    const [pin, setPin] = useState('');
    const [pinAuthenticated, setPinAuthenticated] = useState(() => {
        return sessionStorage.getItem(MASTER_SESSION_KEY) === 'true';
    });
    const [errorMsg, setErrorMsg] = useState('');

    // Rate Limiting & 15-Minute Lockout State
    const [attempts, setAttempts] = useState(getStoredAttempts);
    const [lockoutUntil, setLockoutUntil] = useState(getStoredLockout);
    const [secondsLeft, setSecondsLeft] = useState(() => getRemainingSeconds(getStoredLockout()));

    const isLocked = lockoutUntil > 0 && secondsLeft > 0;

    // Countdown Timer for Lockout
    useEffect(() => {
        if (!isLocked) return;

        const timer = setInterval(() => {
            const remaining = getRemainingSeconds(lockoutUntil);
            if (remaining <= 0) {
                setLockoutUntil(0);
                setSecondsLeft(0);
                setAttempts(0);
                setErrorMsg('');
                try {
                    localStorage.removeItem(STORAGE_KEY_LOCKOUT);
                    localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
                } catch {
                    // Ignore storage errors
                }
                toast.success('Kunci keamanan telah dibuka. Anda dapat mencoba lagi.');
                clearInterval(timer);
            } else {
                setSecondsLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isLocked, lockoutUntil]);

    // Handle Verify PIN Handler (Declared before any conditional return)
    const handleVerifyPin = useCallback((e) => {
        e.preventDefault();

        if (isLocked) {
            toast.error(`Portal dikunci! Silakan tunggu ${formatLockoutTime(secondsLeft)}.`);
            return;
        }

        if (pin === MASTER_PIN) {
            sessionStorage.setItem(MASTER_SESSION_KEY, 'true');
            setPinAuthenticated(true);
            setAttempts(0);
            setErrorMsg('');
            try {
                localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
                localStorage.removeItem(STORAGE_KEY_LOCKOUT);
            } catch {
                // Ignore storage errors
            }
            toast.success('Akses Master Admin Diberikan');
        } else {
            const nextAttempts = attempts + 1;
            setAttempts(nextAttempts);
            setPin('');

            try {
                localStorage.setItem(STORAGE_KEY_ATTEMPTS, String(nextAttempts));
            } catch {
                // Ignore storage errors
            }

            if (nextAttempts >= MAX_ATTEMPTS) {
                const now = Date.now();
                const lockTime = now + LOCKOUT_DURATION_MS;
                setLockoutUntil(lockTime);
                setSecondsLeft(Math.ceil(LOCKOUT_DURATION_MS / 1000));
                try {
                    localStorage.setItem(STORAGE_KEY_LOCKOUT, String(lockTime));
                } catch {
                    // Ignore storage errors
                }
                setErrorMsg('Terlalu banyak percobaan salah (5x). Portal dikunci selama 15 menit demi keamanan.');
                toast.error('Portal dikunci selama 15 menit!');
            } else {
                const remaining = MAX_ATTEMPTS - nextAttempts;
                setErrorMsg(`PIN Keamanan Salah! Sisa percobaan: ${remaining} kali.`);
                toast.error(`PIN Salah! Sisa percobaan: ${remaining}x`);
            }
        }
    }, [isLocked, pin, attempts, secondsLeft]);

    if (loading) {
        return <Spinner text="Memverifikasi Otoritas Master..." />;
    }

    // 1. Level 1 Security: Harus Login
    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }

    // 2. Level 2 Security: Email / Role Master Admin Check
    const isMasterAdmin = 
        user.email === 'rafif.muh.anwar@gmail.com' || 
        userData?.role === 'master_admin';

    if (!isMasterAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white border border-border rounded-2xl p-8 text-center shadow-xs">
                    <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600">
                        <ShieldAlert className="w-7 h-7" />
                    </div>
                    <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-full border border-rose-200">
                        Akses Ditolak • 403 Forbidden
                    </span>
                    <h1 className="text-xl font-bold text-secondary mt-3 mb-1">
                        Portal Master Admin
                    </h1>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                        Akun <span className="text-secondary font-semibold">{user.email}</span> tidak memiliki hak akses Super Administrator.
                    </p>
                    <a
                        href="/admin"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary hover:bg-secondary/90 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Kembali ke Dashboard Resto</span>
                    </a>
                </div>
            </div>
        );
    }

    // 3. Level 3 Security: PIN Challenge with 15-Minute Lockout
    if (!pinAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
                    <div className="text-center mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors ${
                            isLocked 
                                ? 'bg-rose-50 border border-rose-200 text-rose-600' 
                                : 'bg-primary/10 border border-primary/20 text-primary'
                        }`}>
                            <Lock className="w-6 h-6" />
                        </div>
                        <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                            isLocked 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                            {isLocked ? 'Keamanan: Sistem Terkunci' : 'Portal Master Admin'}
                        </span>
                        <h2 className="text-xl font-bold text-secondary mt-2.5">Verifikasi Master PIN</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Masukkan 6 digit kode keamanan untuk mengakses konsol platform eMakan
                        </p>
                    </div>

                    {isLocked ? (
                        <div className="space-y-5">
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-1.5">
                                <div className="flex items-center justify-center gap-1.5 text-rose-700 font-bold text-xs">
                                    <Clock className="w-4 h-4 text-rose-600" />
                                    <span>Percobaan Maksimal Tercapai</span>
                                </div>
                                <p className="text-[11px] text-rose-600 leading-relaxed">
                                    Sistem mendeteksi 5 kali percobaan PIN yang salah. Portal ini dikunci otomatis selama 15 menit demi keamanan data.
                                </p>
                                <div className="pt-2">
                                    <p className="text-[10px] uppercase tracking-wider text-rose-500 font-bold">Waktu Tunggu Tersisa</p>
                                    <p className="font-mono text-2xl font-black text-rose-700 tracking-widest mt-0.5">
                                        {formatLockoutTime(secondsLeft)}
                                    </p>
                                </div>
                            </div>

                            <div className="text-center pt-1">
                                <a
                                    href="/admin"
                                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-secondary font-medium transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Kembali ke Dashboard Resto</span>
                                </a>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleVerifyPin} className="space-y-5">
                            <div>
                                <div className="relative">
                                    <input
                                        type="password"
                                        maxLength={6}
                                        autoFocus
                                        value={pin}
                                        onChange={(e) => {
                                            setErrorMsg('');
                                            setPin(e.target.value.replace(/\D/g, ''));
                                        }}
                                        placeholder="••••••"
                                        className="w-full text-center text-2xl tracking-[0.6em] font-mono py-3.5 bg-slate-50 border border-border rounded-xl text-secondary placeholder-slate-300 focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                                    />
                                </div>
                                {errorMsg && (
                                    <p className="text-rose-600 text-xs font-semibold text-center mt-2 flex items-center justify-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{errorMsg}</span>
                                    </p>
                                )}
                                {attempts > 0 && attempts < MAX_ATTEMPTS && (
                                    <p className="text-[11px] text-amber-600 font-medium text-center mt-1.5">
                                        Peringatan: Gagal 5 kali akan mengunci portal selama 15 menit.
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={pin.length < 6}
                                className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <KeyRound className="w-4 h-4" />
                                <span>Buka Kunci Portal</span>
                            </button>

                            <div className="text-center pt-1">
                                <a
                                    href="/admin"
                                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-secondary font-medium transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Kembali ke Dashboard Resto</span>
                                </a>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return children;
}
