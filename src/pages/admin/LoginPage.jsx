import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginWithGoogle, loginWithGoogleIdToken } from '../../services/authService';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const navigate = useNavigate();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [gisLoaded, setGisLoaded] = useState(false);
    const googleBtnContainerRef = useRef(null);

    const googleClientId = (
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '52255294551-11odagmnuuetps8jha1j09i5d31oosbu.apps.googleusercontent.com'
    ).trim();

    // Handler login langsung via Google ID Token (Native - tanpa melempar ke URL supabase.co)
    const handleCredentialResponse = useCallback(async (response) => {
        setGoogleLoading(true);
        try {
            if (!response?.credential) {
                throw new Error('Tidak ada token kredensial Google yang diterima.');
            }
            await loginWithGoogleIdToken(response.credential);
            toast.success('Login berhasil! Selamat datang di eMakan POS.');
            navigate('/admin');
        } catch (err) {
            setGoogleLoading(false);
            toast.error(err?.message || 'Gagal login melalui Google ID Token.');
        }
    }, [navigate]);

    useEffect(() => {
        if (!googleClientId) return;

        const initGoogleGsi = () => {
            if (window.google?.accounts?.id && googleBtnContainerRef.current) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: googleClientId,
                        callback: handleCredentialResponse,
                        auto_select: false,
                    });

                    googleBtnContainerRef.current.innerHTML = '';
                    window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
                        theme: 'outline',
                        size: 'large',
                        type: 'standard',
                        shape: 'rectangular',
                        text: 'signin_with',
                        width: 320,
                        logo_alignment: 'left',
                    });

                    setGisLoaded(true);
                    console.log("Google GIS Button successfully rendered!");
                } catch (e) {
                    console.warn('Google GIS button render error:', e);
                }
            }
        };

        if (window.google?.accounts?.id) {
            initGoogleGsi();
        } else {
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(interval);
                    initGoogleGsi();
                }
            }, 300);
            return () => clearInterval(interval);
        }
    }, [googleClientId, handleCredentialResponse]);

    // Fallback login redirect jika GIS script tidak aktif atau diblokir adblocker
    const handleFallbackGoogleAuth = async () => {
        setGoogleLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            toast.error(err?.message || 'Gagal login dengan Google');
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
            <div className="w-full max-w-md">
                {/* Back to Home Link */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-orange-400 transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Beranda eMakan</span>
                </Link>

                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <img
                        src="/logo.png"
                        alt="eMakan Logo"
                        className="w-16 h-16 object-contain rounded-2xl mx-auto mb-4 shadow-xl shadow-orange-500/10 border border-white/10"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tight">eMakan Admin POS</h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                        Portal Masuk Pengelola Toko & Kasir
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 space-y-6">
                    <div className="text-center space-y-1">
                        <h2 className="text-base font-bold text-slate-800">Autentikasi Aman</h2>
                        <p className="text-xs text-slate-500">
                            Masuk langsung menggunakan akun Google yang terhubung dengan resto Anda.
                        </p>
                    </div>

                    {/* Google Auth Container */}
                    <div className="space-y-3">
                        {/* Tombol Resmi Google Identity Services (Direct Sign-In) */}
                        <div className="w-full flex justify-center min-h-[44px]">
                            <div
                                ref={googleBtnContainerRef}
                                className={`w-full flex justify-center ${gisLoaded && !googleLoading ? 'block' : 'hidden'}`}
                            />
                        </div>

                        {/* Fallback button jika GIS sedang loading atau diblokir */}
                        {(!gisLoaded || googleLoading) && (
                            <button
                                type="button"
                                onClick={handleFallbackGoogleAuth}
                                disabled={googleLoading}
                                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-sm transition-all cursor-pointer hover:border-slate-400 active:scale-[0.99] disabled:opacity-70"
                            >
                                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span>{googleLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}</span>
                            </button>
                        )}
                    </div>

                    {/* Security Footnote */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500 text-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Dilindungi Google OAuth 2.0 & Enkripsi Supabase</span>
                    </div>
                </div>

                {/* Footer Notice */}
                <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Akses privat & terenkripsi untuk staf dan pengelola resto</span>
                </div>
            </div>
        </div>
    );
}
