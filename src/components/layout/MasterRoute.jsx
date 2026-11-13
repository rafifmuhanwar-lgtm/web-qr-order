import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../ui/Spinner';
import { ShieldAlert, Lock, KeyRound, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// Master Security PIN (Dapat diubah atau disimpan di env)
const MASTER_PIN = '998877';
const MASTER_SESSION_KEY = 'emakan_master_authenticated_session';

export default function MasterRoute({ children }) {
    const { user, userData, loading } = useAuth();
    const [pin, setPin] = useState('');
    const [pinAuthenticated, setPinAuthenticated] = useState(() => {
        return sessionStorage.getItem(MASTER_SESSION_KEY) === 'true';
    });
    const [errorMsg, setErrorMsg] = useState('');

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
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-red-950/50">
                    <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 animate-pulse">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-mono font-bold tracking-widest rounded-full border border-red-500/30 uppercase">
                        Access Denied • 403 Forbidden
                    </span>
                    <h1 className="text-2xl font-black text-white mt-4 mb-2 tracking-tight">
                        PORTAL MASTER ADMIN
                    </h1>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                        Akun <span className="text-slate-200 font-semibold">{user.email}</span> tidak memiliki hak akses Super Administrator. Aktivitas dan IP request ini tercatat demi keamanan sistem.
                    </p>
                    <a
                        href="/admin"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl border border-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Dashboard Resto
                    </a>
                </div>
            </div>
        );
    }

    // 3. Level 3 Security: 6-Digit Master Security PIN Challenge
    const handleVerifyPin = (e) => {
        e.preventDefault();
        if (pin === MASTER_PIN) {
            sessionStorage.setItem(MASTER_SESSION_KEY, 'true');
            setPinAuthenticated(true);
            toast.success('Akses Master Admin Diberikan 🛡️');
        } else {
            setErrorMsg('PIN Keamanan Salah! Akses Ditolak.');
            setPin('');
            toast.error('PIN Salah!');
        }
    };

    if (!pinAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-8 shadow-2xl shadow-indigo-950/50">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-widest rounded-full border border-indigo-500/30 uppercase">
                            Security Clearance Level 5
                        </span>
                        <h2 className="text-2xl font-black text-white mt-3">Verifikasi Master PIN</h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Masukkan 6 digit Master Passcode untuk mengakses console platform eMakan
                        </p>
                    </div>

                    <form onSubmit={handleVerifyPin} className="space-y-6">
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
                                    placeholder="• • • • • •"
                                    className="w-full text-center text-3xl tracking-[1em] font-mono py-4 bg-slate-950 border-2 border-indigo-500/40 rounded-2xl text-white placeholder-slate-700 focus:outline-none focus:border-indigo-400 transition-colors shadow-inner"
                                />
                            </div>
                            {errorMsg && (
                                <p className="text-red-400 text-xs font-medium text-center mt-2 animate-bounce">
                                    {errorMsg}
                                </p>
                            )}
                            <p className="text-[11px] text-slate-500 text-center mt-2">
                                Hint default dev: <span className="font-mono text-slate-400">998877</span>
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={pin.length < 6}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <KeyRound className="w-5 h-5" />
                            Buka Kunci Portal
                        </button>

                        <div className="text-center pt-2">
                            <a
                                href="/admin"
                                className="text-xs text-slate-400 hover:text-white transition-colors"
                            >
                                ← Kembali ke Admin Biasa
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return children;
}
