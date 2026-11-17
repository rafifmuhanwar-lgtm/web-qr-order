import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginWithGoogle, loginWithGoogleIdToken } from '../../services/authService';
import { 
    ArrowLeft, 
    ShieldCheck, 
    Lock, 
    Sparkles, 
    CheckCircle2, 
    QrCode, 
    Bike, 
    Receipt
} from 'lucide-react';
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
        <div className="min-h-screen bg-slate-950 flex flex-col lg:grid lg:grid-cols-12 text-slate-100 selection:bg-orange-500 selection:text-white relative overflow-hidden">
            
            {/* Ambient Lighting & Glow */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Left Side: Brand Showcase & POS Live Preview (Desktop) */}
            <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 xl:p-16 relative border-r border-slate-800/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                {/* Brand Header */}
                <div className="flex items-center gap-3">
                    <img
                        src="/logo.png"
                        alt="eMakan"
                        className="w-10 h-10 object-contain rounded-xl shadow-md border border-white/10"
                    />
                    <div>
                        <span className="text-xl font-black tracking-tight text-white">eMakan</span>
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            POS & RESTO SYSTEM
                        </span>
                    </div>
                </div>

                {/* Hero Pitch & Live Widget Preview */}
                <div className="my-auto py-12 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-6">
                        <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                        <span>Sistem Kasir & Pemesanan Mandiri Restoran Modern</span>
                    </div>

                    <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight mb-5">
                        Kelola Meja, Pesanan & Delivery dalam{' '}
                        <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                            Satu Layar Sentuh.
                        </span>
                    </h1>

                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        Dukung pesanan makan di tempat (Dine-In QR Meja) dan pesanan antar mandiri dari rumah dengan kalkulasi ongkir GPS otomatis tanpa potongan komisi pihak ketiga.
                    </p>

                    {/* Glassmorphic Mockup Card */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-bold text-white">Live Kitchen & Cashier Sync</span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">Order #EM-2026</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status Meja</div>
                                <div className="font-black text-white text-sm flex items-center gap-1.5">
                                    <QrCode className="w-4 h-4 text-orange-400" />
                                    <span>Meja #04 • Dine-In</span>
                                </div>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Pembayaran</div>
                                <div className="font-black text-emerald-400 text-sm flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>QRIS • Lunas Otomatis</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><Bike className="w-3.5 h-3.5 text-orange-400" /> GPS Map</span>
                                <span className="flex items-center gap-1"><Receipt className="w-3.5 h-3.5 text-amber-400" /> Struk Thermal</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-white">Rp 74.000</span>
                        </div>
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-800/50">
                    <span>© {new Date().getFullYear()} eMakan POS Platform</span>
                    <span>100% Bebas Biaya Komisi Restoran</span>
                </div>
            </div>

            {/* Right Side: The Clean Auth Panel */}
            <div className="flex-1 lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 relative z-10">
                {/* Top Nav: Back to Home */}
                <div className="flex justify-between items-center w-full">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-orange-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Kembali ke Beranda</span>
                    </Link>

                    {/* Small screen mobile logo */}
                    <div className="lg:hidden flex items-center gap-2">
                        <img src="/logo.png" alt="eMakan" className="w-6 h-6 object-contain rounded-md" />
                        <span className="font-black text-sm text-white">eMakan</span>
                    </div>
                </div>

                {/* Auth Card Center */}
                <div className="w-full max-w-sm mx-auto my-auto py-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/10">
                            <img
                                src="/logo.png"
                                alt="eMakan"
                                className="w-10 h-10 object-contain rounded-xl"
                            />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Portal Masuk Resto</h2>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            Akses dashboard kasir, kelola meja, menu, dan laporan harian toko Anda.
                        </p>
                    </div>

                    {/* Auth Box Container */}
                    <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-5">
                        <div className="text-center">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                Single Sign-On Kasir
                            </span>
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
                                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs shadow-sm transition-all cursor-pointer hover:border-slate-600 active:scale-[0.99] disabled:opacity-70"
                                >
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    <span>{googleLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Akun Google'}</span>
                                </button>
                            )}
                        </div>

                        {/* Security Verification Footnote */}
                        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Terproteksi Google OAuth & Enkripsi Supabase</span>
                        </div>
                    </div>

                    {/* Notice Footnote */}
                    <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                        <span>Akses privat & terenkripsi untuk pengelola resto</span>
                    </div>
                </div>

                {/* Bottom Simple Copyright */}
                <div className="text-center text-[11px] text-slate-600">
                    Sistem POS Resto eMakan • Multi-Outlet & QR Order
                </div>
            </div>
        </div>
    );
}
