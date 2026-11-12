import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginWithGoogle } from '../services/authService';
import {
    QrCode,
    UtensilsCrossed,
    Clock,
    Zap,
    Receipt,
    BarChart3,
    Smartphone,
    ArrowRight,
    ChevronDown,
    CheckCircle2,
    ChefHat,
    DollarSign,
    Menu,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';

const CURRENT_YEAR = new Date().getFullYear();

export default function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState(0);

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
            q: 'Apakah pelanggan wajib mengunduh aplikasi?',
            a: 'Tidak perlu. Pelanggan cukup membuka kamera HP, scan QR code di meja mereka, dan menu eMakan akan langsung terbuka di browser tanpa perlu instal apa pun.'
        },
        {
            q: 'Bagaimana cara mendaftar toko baru?',
            a: 'Cukup 1-klik dengan akun Google Anda. Sistem eMakan otomatis membuatkan akun admin dan dashboard restoran Anda seketika.'
        },
        {
            q: 'Apakah kasir bisa digunakan di HP atau tablet biasa?',
            a: 'Bisa. eMakan responsif dan ringan, dapat dibuka lewat browser di Android, iPhone, iPad, tablet kasir, hingga laptop/PC.'
        },
        {
            q: 'Metode pembayaran apa saja yang didukung?',
            a: 'Mendukung pembayaran tunai di kasir (dengan hitung kembalian otomatis) serta pembayaran QRIS dinamis.'
        },
        {
            q: 'Apakah struk belanja bisa dicetak ke printer kasir?',
            a: 'Bisa. Tersedia generator struk otomatis siap cetak ke printer Bluetooth thermal maupun diunduh oleh pelanggan.'
        }
    ];

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-[#171717] font-sans antialiased selection:bg-orange-500 selection:text-white">
            
            {/* Header / Navbar */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    
                    {/* Brand Logo */}
                    <div 
                        className="flex items-center gap-2.5 cursor-pointer" 
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <img 
                            src="/logo.png" 
                            alt="eMakan" 
                            className="w-8 h-8 rounded-lg object-contain shadow-sm" 
                        />
                        <span className="text-xl font-bold tracking-tight text-[#171717]">eMakan</span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
                        <a href="#cara-kerja" className="hover:text-black transition-colors">Cara Kerja</a>
                        <a href="#fitur" className="hover:text-black transition-colors">Fitur</a>
                        <a href="#faq" className="hover:text-black transition-colors">FAQ</a>
                    </nav>

                    {/* Action Button */}
                    <div className="hidden sm:flex items-center gap-3">
                        {isAuthenticated ? (
                            <button
                                onClick={() => navigate('/admin')}
                                className="px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                            >
                                Dashboard Kasir →
                            </button>
                        ) : (
                            <button
                                onClick={handleGoogleAuth}
                                disabled={googleLoading}
                                className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span>{googleLoading ? 'Memproses...' : 'Masuk via Google'}</span>
                            </button>
                        )}
                    </div>

                    {/* Mobile Hamburger Button */}
                    <button 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="sm:hidden p-2 text-neutral-600 hover:text-black cursor-pointer"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Dropdown */}
                {mobileMenuOpen && (
                    <div className="sm:hidden border-t border-neutral-200 bg-white px-4 py-4 space-y-3">
                        <a 
                            href="#cara-kerja" 
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-sm font-medium text-neutral-600 py-1"
                        >
                            Cara Kerja
                        </a>
                        <a 
                            href="#fitur" 
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-sm font-medium text-neutral-600 py-1"
                        >
                            Fitur
                        </a>
                        <a 
                            href="#faq" 
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-sm font-medium text-neutral-600 py-1"
                        >
                            FAQ
                        </a>
                        <div className="pt-2">
                            <button
                                onClick={() => { setMobileMenuOpen(false); handleGoogleAuth(); }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#171717] text-white text-xs font-semibold rounded-xl"
                            >
                                <span>{isAuthenticated ? 'Buka Dashboard' : 'Masuk dengan Google'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="pt-16 pb-16 px-4 sm:px-6 max-w-4xl mx-auto text-center">
                
                {/* Pill Tag */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-orange-700 text-xs font-medium mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span>Sistem Kasir & Pemesanan Mandiri Meja</span>
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#171717] leading-tight mb-5">
                    Semua Kebutuhan Order Meja & Kasir Resto, <br className="hidden sm:inline" />
                    <span className="text-orange-600">Dalam Satu Sistem.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-neutral-500 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed font-normal">
                    Pelanggan cukup scan QR di meja, pilih menu, dan bayar. Pesanan langsung masuk ke layar kasir dan dapur secara real-time tanpa antre.
                </p>

                {/* Main Action Box */}
                <div className="max-w-sm mx-auto mb-12">
                    <button
                        onClick={handleGoogleAuth}
                        disabled={googleLoading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#171717] hover:bg-black text-white text-sm font-semibold rounded-2xl shadow-md shadow-neutral-900/10 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        <svg className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{isAuthenticated ? 'Masuk ke Dashboard' : 'Mulai Sekarang dengan Google'}</span>
                    </button>
                    <p className="text-[11px] text-neutral-400 mt-2.5">
                        Daftar instan dalam 1-klik • Gratis tanpa kartu kredit
                    </p>
                </div>

                {/* Minimalist Preview Card */}
                <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-neutral-200/90 p-5 sm:p-7 shadow-sm text-left">
                    <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                        <div className="flex items-center gap-2.5">
                            <img src="/logo.png" alt="eMakan" className="w-7 h-7 rounded-lg" />
                            <div>
                                <h3 className="font-bold text-sm text-[#171717]">eMakan POS</h3>
                                <p className="text-[11px] text-neutral-400">Pratinjau Meja & Kasir</p>
                            </div>
                        </div>
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            ● Realtime Aktif
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {/* Box 1: Sisi Pelanggan */}
                        <div className="p-3.5 rounded-2xl bg-neutral-50/80 border border-neutral-200/60">
                            <span className="text-[10px] font-mono uppercase font-bold text-neutral-400">Tampilan Meja #03</span>
                            <div className="mt-2 space-y-1.5 text-xs">
                                <div className="flex justify-between py-1 border-b border-neutral-200/40">
                                    <span className="text-neutral-700">Mie Spesial Level 2</span>
                                    <span className="font-semibold text-neutral-900">Rp 15.000</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-neutral-700">Es Lemon Tea</span>
                                    <span className="font-semibold text-neutral-900">Rp 8.000</span>
                                </div>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-neutral-200 flex justify-between text-xs font-bold text-orange-600">
                                <span>Total Pesanan:</span>
                                <span>Rp 23.000</span>
                            </div>
                        </div>

                        {/* Box 2: Sisi Kasir */}
                        <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200/50">
                            <span className="text-[10px] font-mono uppercase font-bold text-orange-600">Layar Kasir (Notifikasi Masuk)</span>
                            <div className="mt-2 text-xs text-neutral-700 space-y-1">
                                <p className="font-bold text-neutral-900">Pesanan Baru: Meja #03</p>
                                <p className="text-[11px] text-neutral-500">2 Item • Bayar di Kasir</p>
                                <div className="pt-2 flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-orange-600 text-white font-semibold">
                                        Siapkan Pesanan
                                    </span>
                                    <span className="text-[11px] text-neutral-400">0m lalu</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </section>

            {/* Cara Kerja 3 Langkah */}
            <section id="cara-kerja" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto border-t border-neutral-200/60">
                <div className="text-center max-w-md mx-auto mb-12">
                    <span className="text-xs font-mono uppercase tracking-wider text-orange-600 font-bold">
                        Cara Kerja
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] mt-1.5">
                        3 Langkah Mudah
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800 font-bold text-sm mb-4">
                            1
                        </div>
                        <h4 className="font-bold text-sm text-[#171717] mb-1.5">Cetak QR Meja</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                            Generate nomor meja dari dashboard admin eMakan sekali klik dan pasang stiker QR di masing-masing meja.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 font-bold text-sm mb-4">
                            2
                        </div>
                        <h4 className="font-bold text-sm text-[#171717] mb-1.5">Pelanggan Scan & Pesan</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                            Pelanggan memindai QR meja lewat kamera HP, memilih hidangan favorit, dan langsung mengirim pesanan.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800 font-bold text-sm mb-4">
                            3
                        </div>
                        <h4 className="font-bold text-sm text-[#171717] mb-1.5">Dapur & Kasir Proses</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                            Pesanan langsung muncul di layar kasir secara real-time. Dapur menyiapkan makanan tanpa salah catat.
                        </p>
                    </div>
                </div>
            </section>

            {/* Fitur Utama */}
            <section id="fitur" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto border-t border-neutral-200/60">
                <div className="text-center max-w-md mx-auto mb-12">
                    <span className="text-xs font-mono uppercase tracking-wider text-orange-600 font-bold">
                        Fitur Utama
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] mt-1.5">
                        Ringkas, Cepat & Praktis
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 flex gap-4 items-start">
                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl shrink-0">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1">QR Order Mandiri</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Pelanggan memesan mandiri tanpa perlu memanggil pelayan atau antre berjejal di meja kasir.
                            </p>
                        </div>
                    </div>

                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 flex gap-4 items-start">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1">Sinkronisasi Realtime</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Pesanan baru otomatis muncul di dashboard admin detik itu juga tanpa perlu reload halaman.
                            </p>
                        </div>
                    </div>

                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 flex gap-4 items-start">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1">Bayar QRIS atau Kasir</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Mendukung pembayaran instan dengan scan kode QRIS atau bayar tunai langsung di meja kasir.
                            </p>
                        </div>
                    </div>

                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 flex gap-4 items-start">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1">Cetak Struk Pembayaran</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Otomatis menghasilkan gambar struk rapi beresolusi tajam siap dicetak ke printer kasir bluetooth.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-16 px-4 sm:px-6 max-w-2xl mx-auto border-t border-neutral-200/60">
                <div className="text-center mb-10">
                    <span className="text-xs font-mono uppercase tracking-wider text-orange-600 font-bold">
                        Bantuan
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] mt-1.5">
                        Pertanyaan Umum
                    </h2>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, idx) => {
                        const isOpen = openFaqIndex === idx;
                        return (
                            <div 
                                key={idx}
                                className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-[#171717] hover:text-orange-600 transition-colors cursor-pointer"
                                >
                                    <span>{faq.q}</span>
                                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-600' : 'text-neutral-400'}`} />
                                </button>
                                {isOpen && (
                                    <div className="px-4 sm:px-5 pb-5 text-xs text-neutral-500 leading-relaxed border-t border-neutral-100 pt-3">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Bottom CTA Box */}
            <section className="py-16 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto bg-[#171717] text-white rounded-3xl p-8 sm:p-12 text-center shadow-lg">
                    <img src="/logo.png" alt="eMakan" className="w-12 h-12 rounded-xl mx-auto mb-4" />
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
                        Mulai Pakai eMakan Sekarang
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto mb-7 leading-relaxed font-light">
                        Tingkatkan efisiensi restoran, kafe, atau warkop Anda tanpa biaya awal yang mahal.
                    </p>
                    <button
                        onClick={handleGoogleAuth}
                        disabled={googleLoading}
                        className="inline-flex items-center gap-2.5 px-6 py-3 bg-white hover:bg-neutral-100 text-[#171717] text-xs font-semibold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Daftar Cepat dengan Google</span>
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 sm:px-6 bg-white border-t border-neutral-200/80 text-center text-xs text-neutral-400">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="eMakan" className="w-5 h-5 rounded-md" />
                        <span className="font-semibold text-neutral-700">eMakan</span>
                        <span>• Sistem Kasir & QR Order Restoran Indonesia</span>
                    </div>
                    <div>
                        © {CURRENT_YEAR} eMakan. Semua hak dilindungi.
                    </div>
                </div>
            </footer>

        </div>
    );
}
