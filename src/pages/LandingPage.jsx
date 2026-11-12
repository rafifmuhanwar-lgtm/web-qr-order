import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginWithGoogle } from '../services/authService';
import {
    QrCode,
    UtensilsCrossed,
    Clock,
    Zap,
    ShieldCheck,
    Receipt,
    Palette,
    BarChart3,
    Smartphone,
    ArrowRight,
    ChevronDown,
    CheckCircle2,
    ChefHat,
    DollarSign,
    Store,
    Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);

    const handleGoogleAuth = async () => {
        if (isAuthenticated) {
            navigate('/admin');
            return;
        }
        setGoogleLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            toast.error(err?.message || 'Gagal login dengan Google');
            setGoogleLoading(false);
        }
    };

    const faqs = [
        {
            q: 'Apakah pelanggan wajib menginstal aplikasi untuk memesan?',
            a: 'Tidak perlu sama sekali! Pelanggan cukup membuka kamera smartphone mereka, memindai QR code di meja, dan halaman menu eMakan akan langsung terbuka di browser tanpa perlu download apa pun.'
        },
        {
            q: 'Bagaimana cara mendaftar toko baru di eMakan?',
            a: 'Sangat mudah dan instan! Anda hanya perlu klik tombol "Daftar dengan Google". Sistem eMakan akan otomatis membuatkan dashboard toko dan akun kasir Anda dalam hitungan detik.'
        },
        {
            q: 'Apakah eMakan bisa digunakan di HP atau tablet kasir?',
            a: 'Ya, 100% responsif! Dashboard kasir dan dapur eMakan dapat diakses lancar lewat browser di laptop, tablet, iPad, maupun smartphone Android/iOS.'
        },
        {
            q: 'Apakah mendukung pembayaran QRIS dan Tunai?',
            a: 'Tentu saja! eMakan mendukung pembayaran kasir tunai (dengan hitung kembalian otomatis) serta pembayaran digital via QRIS dinamis.'
        },
        {
            q: 'Apakah struk pembayaran bisa dicetak?',
            a: 'Bisa! eMakan dilengkapi generator struk otomatis beresolusi tinggi (format PNG) yang bisa langsung dicetak menggunakan printer thermal Bluetooth/USB atau diunduh oleh pelanggan.'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
            {/* Background Glow Accents */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/3 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-red-500/15 rounded-full blur-3xl" />
            </div>

            {/* Navbar */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src="/logo.png" alt="eMakan Logo" className="w-9 h-9 object-contain rounded-xl shadow-md shadow-orange-500/20" />
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-extrabold tracking-tight text-white">eMakan</span>
                            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                QR POS
                            </span>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
                        <a href="#fitur" className="hover:text-orange-400 transition-colors">Fitur</a>
                        <a href="#cara-kerja" className="hover:text-orange-400 transition-colors">Cara Kerja</a>
                        <a href="#keunggulan" className="hover:text-orange-400 transition-colors">Keunggulan</a>
                        <a href="#faq" className="hover:text-orange-400 transition-colors">FAQ</a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleGoogleAuth}
                            disabled={googleLoading}
                            className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-70"
                        >
                            {googleLoading ? (
                                <span>Menghubungkan...</span>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    <span>{isAuthenticated ? 'Buka Dashboard' : 'Masuk Google'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-16 pb-20 px-4 max-w-6xl mx-auto text-center lg:pt-24">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-6 animate-fade-in">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sistem Restoran Modern & Kasir Digital Masa Kini</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto mb-6">
                    Tingkatkan Omzet Resto Anda dengan Pemesanan <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">QR Mandiri</span>
                </h1>

                <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
                    Pelanggan cukup duduk di meja, scan QR code, pilih menu lezat, dan bayar seketika. Dapur & kasir menerima pesanan real-time tanpa antre panjang.
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-14">
                    <button
                        onClick={handleGoogleAuth}
                        disabled={googleLoading}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    >
                        <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Daftar / Masuk via Google</span>
                    </button>
                    <a
                        href="#cara-kerja"
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-base font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all text-center"
                    >
                        Pelajari Cara Kerja ↓
                    </a>
                </div>

                {/* Hero Interactive Mockup Showcase */}
                <div className="relative max-w-4xl mx-auto rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 p-4 sm:p-8 shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        {/* Mockup 1: Customer Mobile View */}
                        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-xl text-left">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <img src="/logo.png" className="w-5 h-5 rounded-md" alt="" />
                                    <span className="font-bold text-xs text-white">eMakan Resto</span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">Meja #05</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-white">Mie Level 3 (Pedas)</p>
                                        <p className="text-[10px] text-slate-400">1x · Ekstra Pangsit</p>
                                    </div>
                                    <span className="font-bold text-orange-400">Rp 16.000</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-white">Es Teh Manis Jumbo</p>
                                        <p className="text-[10px] text-slate-400">2x</p>
                                    </div>
                                    <span className="font-bold text-orange-400">Rp 12.000</span>
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                                <span className="text-slate-400">Total Pesanan:</span>
                                <span className="font-extrabold text-orange-400 text-sm">Rp 28.000</span>
                            </div>
                        </div>

                        {/* Center: Live Order Flow */}
                        <div className="flex flex-col items-center justify-center py-4 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30 animate-pulse">
                                <Zap className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-semibold text-slate-300">Real-time Sync Instant</p>
                            <p className="text-[11px] text-slate-400 max-w-[200px]">Pesanan langsung diterima dapur tanpa perlu pelayan mencatat manual</p>
                            <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Supabase Channels Aktif</span>
                            </div>
                        </div>

                        {/* Mockup 2: Admin Live Orders */}
                        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-xl text-left">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                                <span className="font-bold text-xs text-slate-300">Pesanan Masuk</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-orange-400 text-xs">Meja #05 (Baru)</span>
                                        <span className="text-[10px] bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded">Menunggu</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300">2 Item · Rp 28.000</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Pembayaran: QRIS (Siap)</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-slate-300 text-xs">Meja #02</span>
                                        <span className="text-[10px] bg-blue-500 text-white font-bold px-1.5 py-0.5 rounded">Diproses</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">4 Item · Rp 54.000</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Metrics */}
            <section className="border-y border-slate-800 bg-slate-950/60 py-10 px-4">
                <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                        <div className="text-3xl lg:text-4xl font-extrabold text-orange-400 mb-1">3x</div>
                        <p className="text-xs sm:text-sm text-slate-400">Perputaran Meja Lebih Cepat</p>
                    </div>
                    <div>
                        <div className="text-3xl lg:text-4xl font-extrabold text-white mb-1">0%</div>
                        <p className="text-xs sm:text-sm text-slate-400">Antrean Panjang di Kasir</p>
                    </div>
                    <div>
                        <div className="text-3xl lg:text-4xl font-extrabold text-orange-400 mb-1">100%</div>
                        <p className="text-xs sm:text-sm text-slate-400">Otomatisasi Real-time</p>
                    </div>
                    <div>
                        <div className="text-3xl lg:text-4xl font-extrabold text-white mb-1">1-Klik</div>
                        <p className="text-xs sm:text-sm text-slate-400">Login Cepat via Google</p>
                    </div>
                </div>
            </section>

            {/* Cara Kerja (How It Works) */}
            <section id="cara-kerja" className="py-20 px-4 max-w-6xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Langkah Mudah</span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
                        Alur Kerja Praktis eMakan
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base">
                        Solusi terintegrasi dari pelanggan memesan di meja hingga dapur menyajikan hidangan.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Step 1 */}
                    <div className="relative p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-orange-500/50 transition-all group">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-5 font-black text-xl group-hover:scale-110 transition-transform">
                            <QrCode className="w-7 h-7" />
                        </div>
                        <span className="text-orange-500 font-mono font-bold text-xs">LANGKAH 01</span>
                        <h3 className="text-xl font-bold text-white mt-1 mb-2">Scan QR di Meja</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Pelanggan duduk santai di meja restoran, membuka kamera smartphone, dan memindai QR code tanpa perlu download aplikasi.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-orange-500/50 transition-all group">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-5 font-black text-xl group-hover:scale-110 transition-transform">
                            <UtensilsCrossed className="w-7 h-7" />
                        </div>
                        <span className="text-amber-500 font-mono font-bold text-xs">LANGKAH 02</span>
                        <h3 className="text-xl font-bold text-white mt-1 mb-2">Pilih Menu & Bayar</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Pelanggan memilih makanan & minuman, menambahkan catatan pedas/manis, lalu memilih bayar di kasir atau scan QRIS langsung.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-orange-500/50 transition-all group">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-5 font-black text-xl group-hover:scale-110 transition-transform">
                            <ChefHat className="w-7 h-7" />
                        </div>
                        <span className="text-red-500 font-mono font-bold text-xs">LANGKAH 03</span>
                        <h3 className="text-xl font-bold text-white mt-1 mb-2">Dapur Masak & Selesai</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Layar kasir dan dapur langsung menerima notifikasi pesanan secara real-time. Pesanan siap dihidangkan, struk dicetak seketika.
                        </p>
                    </div>
                </div>
            </section>

            {/* Fitur Utama */}
            <section id="fitur" className="py-20 px-4 max-w-6xl mx-auto border-t border-slate-800">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Fitur Komprehensif</span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
                        Segala yang Dibutuhkan Kasir & Resto
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base">
                        Dirancang khusus untuk kebutuhan warkop, kafe, depot, dan restoran cepat saji.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/70 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-4">
                            <Zap className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Realtime Orders</h4>
                        <p className="text-slate-400 text-sm">Pesanan masuk langsung muncul tanpa perlu me-refresh halaman dashboard.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/70 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Dukungan QRIS & Kasir</h4>
                        <p className="text-slate-400 text-sm">Pelanggan bisa membayar secara cashless via QRIS atau bayar tunai di meja kasir.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/70 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Cetak Struk Otomatis</h4>
                        <p className="text-slate-400 text-sm">Cetak struk PNG berkualitas tinggi dengan logo dan rincian pesanan akurat.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/70 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                            <Palette className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Personalisasi Brand</h4>
                        <p className="text-slate-400 text-sm">Sesuaikan warna tema, upload logo restoran, dan ubah pesan sambutan pelanggan.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/70 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Laporan Omzet Harian</h4>
                        <p className="text-slate-400 text-sm">Pantau statistik omzet harian, menu terlaris, dan kalender penjualan otomatis.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/70 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Mobile & Tablet Friendly</h4>
                        <p className="text-slate-400 text-sm">Bisa dioperasikan langsung dari HP Android kasir, iPad, maupun PC komputer toko.</p>
                    </div>
                </div>
            </section>

            {/* Keunggulan (Why eMakan) */}
            <section id="keunggulan" className="py-20 px-4 max-w-6xl mx-auto border-t border-slate-800">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Mengapa eMakan?</span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-6">
                            Hemat Biaya Pelayan, Hilangkan Salah Catat Pesanan
                        </h2>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-base">Tidak Ada Lagi Antrean Kasir Mengular</h4>
                                    <p className="text-slate-400 text-sm mt-0.5">Pelanggan langsung duduk di meja tanpa perlu berdesakan mengantre di kasir hanya untuk memesan.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-base">Akurat Tanpa Salah Dengar</h4>
                                    <p className="text-slate-400 text-sm mt-0.5">Pilihan level pedas, es sedikit, atau tanpa bawang dicatat langsung oleh pelanggan secara transparan.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-base">Pendaftaran Mudah & Cepat</h4>
                                    <p className="text-slate-400 text-sm mt-0.5">Cukup login 1-klik menggunakan akun Google Anda dan kelola toko langsung tanpa proses verifikasi berbelit.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative p-8 rounded-3xl bg-gradient-to-br from-orange-500/20 via-slate-800 to-slate-900 border border-orange-500/30 text-center">
                        <img src="/logo.png" alt="eMakan" className="w-24 h-24 mx-auto mb-6 rounded-3xl shadow-xl shadow-orange-500/30" />
                        <h3 className="text-2xl font-black text-white mb-2">Mulai Transformasi Resto Anda</h3>
                        <p className="text-slate-300 text-sm mb-6 max-w-sm mx-auto">
                            Tingkatkan efisiensi kerja tim kasir dan beri pengalaman pesan makan modern untuk pelanggan Anda.
                        </p>
                        <button
                            onClick={handleGoogleAuth}
                            disabled={googleLoading}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/30 transition-all cursor-pointer"
                        >
                            <span>Daftar Gratis Sekarang</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-20 px-4 max-w-4xl mx-auto border-t border-slate-800">
                <div className="text-center mb-14">
                    <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Pertanyaan Umum</span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-3">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-slate-400 text-sm">Segala hal yang sering ditanyakan seputar sistem eMakan.</p>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, idx) => {
                        const isOpen = openFaq === idx;
                        return (
                            <div
                                key={idx}
                                className="rounded-2xl bg-slate-800/40 border border-slate-700/60 overflow-hidden transition-all"
                            >
                                <button
                                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-white hover:text-orange-400 transition-colors cursor-pointer"
                                >
                                    <span>{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-400' : 'text-slate-400'}`} />
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Bottom Call To Action */}
            <section className="py-16 px-4 bg-gradient-to-t from-orange-600/20 to-transparent border-t border-slate-800">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                        Siap Membawa Restoran Anda ke Era Digital?
                    </h2>
                    <p className="text-slate-300 text-base max-w-xl mx-auto mb-8">
                        Daftarkan restoran Anda dalam 1 menit hanya dengan akun Google. Gratis tanpa biaya awal.
                    </p>
                    <button
                        onClick={handleGoogleAuth}
                        disabled={googleLoading}
                        className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/30 transition-all transform hover:-translate-y-1 cursor-pointer"
                    >
                        <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Mulai Sekarang dengan Google</span>
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-4">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="" className="w-6 h-6 rounded-md" />
                        <span className="font-bold text-slate-300 text-sm">eMakan</span>
                        <span>— Sistem Kasir & QR Order Restoran</span>
                    </div>
                    <div>
                        © {new Date().getFullYear()} eMakan. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
