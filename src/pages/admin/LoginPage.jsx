import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginWithGoogle, loginWithGoogleIdToken } from '../../services/authService';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const navigate = useNavigate();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [gisLoaded, setGisLoaded] = useState(false);
    const [showFallback, setShowFallback] = useState(false);
    const googleBtnContainerRef = useRef(null);

    const googleClientId = (
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '52255294551-11odagmnuuetps8jha1j09i5d31oosbu.apps.googleusercontent.com'
    ).trim();

    const handleCredentialResponse = useCallback(async (response) => {
        setGoogleLoading(true);
        try {
            if (!response?.credential) {
                throw new Error('Tidak ada token kredensial Google yang diterima.');
            }
            await loginWithGoogleIdToken(response.credential);
            toast.success('Login berhasil!');
            navigate('/admin');
        } catch (err) {
            setGoogleLoading(false);
            toast.error(err?.message || 'Gagal login melalui Google ID Token.');
        }
    }, [navigate]);

    useEffect(() => {
        if (!googleClientId) return;

        let isMounted = true;

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

                    if (isMounted) setGisLoaded(true);
                } catch (e) {
                    console.warn('Google GIS button render error:', e);
                    if (isMounted) setShowFallback(true);
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
            }, 250);

            const timeout = setTimeout(() => {
                clearInterval(interval);
                if (isMounted && !gisLoaded) {
                    setShowFallback(true);
                }
            }, 3500);

            return () => {
                isMounted = false;
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }

        return () => {
            isMounted = false;
        };
    }, [googleClientId, handleCredentialResponse, gisLoaded]);

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
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center items-center p-4 text-[#171717] font-sans">
            <div className="w-full max-w-[380px] bg-white border border-neutral-200/90 rounded-2xl p-7 sm:p-8 shadow-xs">
                {/* Brand & Heading */}
                <div className="text-center mb-6">
                    <img
                        src="/logo.png"
                        alt="eMakan"
                        className="w-11 h-11 object-contain mx-auto mb-3.5"
                    />
                    <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                        Masuk ke eMakan
                    </h1>
                    <p className="text-xs text-neutral-500 mt-1">
                        Gunakan akun Google Anda untuk melanjutkan
                    </p>
                </div>

                {/* Google Sign-In */}
                <div className="space-y-3">
                    {/* Wadah Resmi Google GIS (Native Sign-In tanpa Supabase redirect) */}
                    <div className="w-full min-h-[44px] flex items-center justify-center relative">
                        <div
                            ref={googleBtnContainerRef}
                            className={`w-full flex justify-center ${googleLoading ? 'opacity-40 pointer-events-none' : ''}`}
                        />

                        {/* Skeleton placeholder saat GIS sedang inisialisasi */}
                        {!gisLoaded && !showFallback && !googleLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white pointer-events-none">
                                <div className="h-10 w-[320px] rounded-md border border-neutral-200 bg-neutral-50 flex items-center justify-center gap-2 text-xs text-neutral-400">
                                    <div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                                    <span>Memuat Google Sign-In...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Indikator Verifikasi Saat Pengguna Memilih Akun */}
                    {googleLoading && (
                        <p className="text-center text-xs text-neutral-500 animate-pulse">
                            Memverifikasi akun Google...
                        </p>
                    )}

                    {/* Fallback button HANYA jika GIS benar-benar gagal dimuat/diblokir browser */}
                    {showFallback && !gisLoaded && (
                        <button
                            type="button"
                            onClick={handleFallbackGoogleAuth}
                            disabled={googleLoading}
                            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs transition-colors cursor-pointer active:scale-[0.99] disabled:opacity-60 shadow-xs"
                        >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>{googleLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}</span>
                        </button>
                    )}
                </div>

                {/* Back to Home Link */}
                <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Kembali ke Beranda</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
