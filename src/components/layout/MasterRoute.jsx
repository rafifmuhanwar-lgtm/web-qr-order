import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../ui/Spinner';
import { Lock, KeyRound, ArrowLeft, ShieldAlert, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Master Security PIN
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

    // 3. Level 3 Security: 6-Digit Master Security PIN Challenge
    const handleVerifyPin = (e) => {
        e.preventDefault();
        if (pin === MASTER_PIN) {
            sessionStorage.setItem(MASTER_SESSION_KEY, 'true');
            setPinAuthenticated(true);
            toast.success('Akses Master Admin Diberikan');
        } else {
            setErrorMsg('PIN Keamanan Salah! Akses Ditolak.');
            setPin('');
            toast.error('PIN Salah!');
        }
    };

    if (!pinAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary">
                            <Lock className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full border border-primary/20">
                            Portal Master Admin
                        </span>
                        <h2 className="text-xl font-bold text-secondary mt-2.5">Verifikasi Master PIN</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Masukkan 6 digit kode keamanan untuk mengakses konsol platform eMakan
                        </p>
                    </div>

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
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{errorMsg}</span>
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
                </div>
            </div>
        );
    }

    return children;
}
