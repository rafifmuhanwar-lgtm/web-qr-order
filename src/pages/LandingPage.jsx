import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    QrCode,
    Bike,
    MapPin,
    MessageSquare,
    Zap,
    Receipt,
    ChevronDown,
    ChefHat,
    DollarSign,
    Menu,
    X,
    Navigation,
    ShieldCheck,
    Store,
    Smartphone,
    CheckCircle2,
    ArrowRight,
    BarChart3
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export default function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState(0);
    const [previewMode, setPreviewMode] = useState('delivery'); // 'delivery' | 'dinein'


    const faqs = [
        {
            q: 'Apakah bisa digunakan untuk pesan antar (delivery) dari rumah?',
            a: 'Bisa! eMakan mendukung 2 mode sekaligus: QR Meja untuk makan di tempat (Dine-In) dan Link Pesan Online untuk pelanggan dari rumah dengan titik peta GPS interaktif, hitung ongkir otomatis, dan rute kurir.'
        },
        {
            q: 'Bagaimana cara kerja penentuan ongkos kirim (ongkir)?',
            a: 'Pemilik resto bisa mengatur batas jarak gratis ongkir (misal 1-5 km gratis), biaya per km untuk jarak selebihnya, dan jarak maksimum pengantaran langsung dari Dashboard Pengaturan.'
        },
        {
            q: 'Apakah pelanggan wajib install aplikasi dari PlayStore/AppStore?',
            a: 'Tidak perlu instal aplikasi apapun. Pelanggan cukup membuka link toko atau scan QR meja lewat kamera HP biasa. Sistem berjalan mulus langsung di browser.'
        },
        {
            q: 'Bagaimana kurir mengantar pesanan ke alamat pembeli?',
            a: 'Di dashboard kasir dan nota pesanan, tersedia tombol 1-klik "Rute Maps" yang langsung membuka Google Maps navigasi belokan demi belokan (turn-by-turn) tepat ke titik koordinat rumah pelanggan.'
        },
        {
            q: 'Apakah ada fitur chat antara pelanggan dan resto/kurir?',
            a: 'Ya, tersedia fitur Live Chat real-time di halaman status pesanan pelanggan dan modal detail pesanan kasir, lengkap dengan template pesan cepat dan shortcut WhatsApp.'
        },
        {
            q: 'Metode pembayaran apa saja yang disediakan?',
            a: 'Mendukung pembayaran langsung dengan scan QRIS serta bayar tunai di kasir atau sistem COD saat pesanan diantar.'
        },
        {
            q: 'Apakah struk belanja bisa dicetak ke printer kasir Bluetooth?',
            a: 'Bisa. Sistem menyediakan generator nota/struk beresolusi tajam yang siap diunduh pelanggan maupun langsung dicetak ke printer kasir thermal Bluetooth.'
        }
    ];

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-[#171717] font-sans antialiased selection:bg-orange-500 selection:text-white">
            
            {/* Header / Navbar */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    
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
                        <div>
                            <span className="text-xl font-black tracking-tight text-[#171717]">eMakan</span>
                            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">POS & DELIVERY</span>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
                        <a href="#fitur" className="hover:text-black transition-colors">Fitur Unggulan</a>
                        <a href="#cara-kerja" className="hover:text-black transition-colors">Cara Kerja</a>
                        <a href="#demo" className="hover:text-black transition-colors">Simulasi Live</a>
                        <a href="#faq" className="hover:text-black transition-colors">FAQ</a>
                    </nav>

                    {/* Action Button */}
                    <div className="hidden sm:flex items-center gap-3">
                        {isAuthenticated ? (
                            <button
                                onClick={() => navigate('/admin')}
                                className="px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                                <span>Buka Dashboard Kasir</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/admin/login')}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                            >
                                <span>Masuk / Daftar</span>
                                <ArrowRight className="w-3.5 h-3.5" />
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
                            href="#fitur" 
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-sm font-medium text-neutral-600 py-1"
                        >
                            Fitur Unggulan
                        </a>
                        <a 
                            href="#cara-kerja" 
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-sm font-medium text-neutral-600 py-1"
                        >
                            Cara Kerja
                        </a>
                        <a 
                            href="#demo" 
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-sm font-medium text-neutral-600 py-1"
                        >
                            Simulasi Live
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
                                onClick={() => { setMobileMenuOpen(false); navigate(isAuthenticated ? '/admin' : '/admin/login'); }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#171717] text-white text-xs font-semibold rounded-xl cursor-pointer"
                            >
                                <span>{isAuthenticated ? 'Buka Dashboard' : 'Masuk / Daftar (Sign In)'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="pt-14 pb-12 px-4 sm:px-6 max-w-5xl mx-auto text-center">
                
                {/* Pill Tag */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold mb-6 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span>Dine-In QR Meja + Pesan Antar (Delivery Internal)</span>
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#171717] leading-tight mb-5">
                    Sistem Kasir, QR Meja & <br className="hidden sm:inline" />
                    <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        Pesan Antar Sendiri
                    </span> Tanpa Komisi.
                </h1>

                {/* Subtitle */}
                <p className="text-neutral-600 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
                    Solusi lengkap resto, kafe & warkop modern. Dukung pesanan makan di tempat via scan QR meja dan pesanan antar dari rumah dengan titik peta GPS, kalkulasi ongkir otomatis, chat kurir, hingga cetak struk kasir otomatis.
                </p>

                {/* Main Action Box */}
                <div className="max-w-md mx-auto mb-12 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => navigate(isAuthenticated ? '/admin' : '/admin/login')}
                        className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-orange-600/25 transition-all active:scale-95 cursor-pointer"
                    >
                        <span>{isAuthenticated ? 'Buka Dashboard Kasir' : 'Mulai Sekarang Gratis'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <a
                        href="#demo"
                        className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 text-sm font-semibold rounded-2xl shadow-xs transition-colors"
                    >
                        Lihat Simulasi Sistem ↓
                    </a>
                </div>

                {/* Highlights Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left pt-2 pb-6">
                    <div className="p-3 bg-white rounded-xl border border-neutral-200/70 shadow-xs flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="text-xs font-semibold text-neutral-800">Peta GPS & Ongkir</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-neutral-200/70 shadow-xs flex items-center gap-2.5">
                        <Bike className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold text-neutral-800">4-Tahap Live Status</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-neutral-200/70 shadow-xs flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-xs font-semibold text-neutral-800">Chat Kurir & Resto</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-neutral-200/70 shadow-xs flex items-center gap-2.5">
                        <Receipt className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-xs font-semibold text-neutral-800">Cetak Struk Kasir</span>
                    </div>
                </div>

                {/* Interactive Dual Preview Card */}
                <div id="demo" className="max-w-3xl mx-auto bg-white rounded-3xl border border-neutral-200/90 p-5 sm:p-7 shadow-sm text-left mt-4">
                    {/* Switcher Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-neutral-100 gap-3">
                        <div className="flex items-center gap-2.5">
                            <img src="/logo.png" alt="eMakan" className="w-8 h-8 rounded-lg shadow-xs" />
                            <div>
                                <h3 className="font-bold text-sm text-[#171717]">Pratinjau Nyata Sistem eMakan</h3>
                                <p className="text-[11px] text-neutral-500">Pilih mode untuk melihat alur kerja langsung</p>
                            </div>
                        </div>

                        {/* Mode Switcher Tabs */}
                        <div className="flex items-center bg-neutral-100 p-1 rounded-xl w-full sm:w-auto">
                            <button
                                onClick={() => setPreviewMode('delivery')}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    previewMode === 'delivery'
                                        ? 'bg-white text-orange-600 shadow-xs'
                                        : 'text-neutral-500 hover:text-neutral-900'
                                }`}
                            >
                                <Bike className="w-3.5 h-3.5" />
                                Pesan Antar (Delivery)
                            </button>
                            <button
                                onClick={() => setPreviewMode('dinein')}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    previewMode === 'dinein'
                                        ? 'bg-white text-orange-600 shadow-xs'
                                        : 'text-neutral-500 hover:text-neutral-900'
                                }`}
                            >
                                <QrCode className="w-3.5 h-3.5" />
                                QR Meja (Dine-In)
                            </button>
                        </div>
                    </div>

                    {/* Preview Content: Delivery Mode */}
                    {previewMode === 'delivery' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                            {/* Box 1: Sisi Pembeli (Peta & Ongkir) */}
                            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase font-bold text-orange-600 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Titik Antar GPS
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                        Gratis Ongkir (2.1 km)
                                    </span>
                                </div>
                                <div className="p-2.5 bg-white rounded-xl border border-neutral-200/60 text-xs">
                                    <p className="font-semibold text-neutral-800 truncate">Jl. Mawar No. 12, Tebet</p>
                                    <p className="text-[11px] text-neutral-500 mt-0.5">Patokan: Pagar hitam depan pos ronda</p>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-neutral-600">
                                        <span>Subtotal (2 Item)</span>
                                        <span className="font-semibold text-neutral-900">Rp 35.000</span>
                                    </div>
                                    <div className="flex justify-between text-neutral-600">
                                        <span>Ongkir (0-5 km Gratis)</span>
                                        <span className="font-semibold text-emerald-600">Rp 0</span>
                                    </div>
                                    <div className="flex justify-between text-neutral-600">
                                        <span>Tip untuk Kurir</span>
                                        <span className="font-semibold text-neutral-900">Rp 5.000</span>
                                    </div>
                                    <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-sm text-neutral-900">
                                        <span>Total Tagihan:</span>
                                        <span className="text-orange-600">Rp 40.000</span>
                                    </div>
                                </div>
                            </div>

                            {/* Box 2: Sisi Kurir & Dapur (Tracking & Chat) */}
                            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase font-bold text-orange-600 flex items-center gap-1">
                                        <Bike className="w-3.5 h-3.5" /> Pelacakan & Kurir
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-200/80 text-orange-800 animate-pulse">
                                        Sedang Diantar
                                    </span>
                                </div>

                                <div className="p-2.5 bg-white rounded-xl border border-orange-200/80 text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-neutral-800">Pak Kurir eMakan</span>
                                        <span className="text-[10px] text-neutral-400">12:35 WIB</span>
                                    </div>
                                    <p className="text-[11px] text-neutral-600 bg-neutral-50 p-2 rounded-lg">
                                        "Halo kak, pesanan sudah selesai dimasak dan sedang saya bawa ke lokasi ya!"
                                    </p>
                                    <div className="flex items-center gap-2 pt-1">
                                        <a
                                            href="https://maps.google.com"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 py-1.5 bg-neutral-900 text-white rounded-lg text-center text-[11px] font-bold hover:bg-black transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Navigation className="w-3 h-3 text-orange-400" /> Rute Google Maps
                                        </a>
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-[11px] font-bold hover:bg-orange-200 transition-colors flex items-center gap-1"
                                        >
                                            <MessageSquare className="w-3 h-3" /> Balas Chat
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Tersinkronisasi otomatis via Supabase Realtime</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview Content: Dine-In Mode */}
                    {previewMode === 'dinein' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                            {/* Box 1: Sisi Meja Pelanggan */}
                            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase font-bold text-neutral-500">
                                        Scan Meja #03
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                        Makan di Tempat
                                    </span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between py-1 border-b border-neutral-200/50">
                                        <span className="text-neutral-700">Mie Spesial Level 2 (Pedas)</span>
                                        <span className="font-semibold text-neutral-900">Rp 15.000</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-neutral-200/50">
                                        <span className="text-neutral-700">Pangsit Goreng Crispy</span>
                                        <span className="font-semibold text-neutral-900">Rp 10.000</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-neutral-700">Es Lemon Tea Jumbo</span>
                                        <span className="font-semibold text-neutral-900">Rp 8.000</span>
                                    </div>
                                    <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-sm text-neutral-900">
                                        <span>Total Pesanan:</span>
                                        <span className="text-orange-600">Rp 33.000</span>
                                    </div>
                                </div>
                            </div>

                            {/* Box 2: Sisi Kasir & Struk */}
                            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase font-bold text-orange-600">
                                        Layar Kasir & Dapur
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                        Lunas (Pesanan Selesai)
                                    </span>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-orange-200/80 text-xs space-y-1.5">
                                    <p className="font-bold text-neutral-900">Order #MEJA-03 (Budi)</p>
                                    <p className="text-[11px] text-neutral-500">3 Menu • Tanpa Antre di Meja Kasir</p>
                                    <div className="pt-2 flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-bold text-[10px]">
                                            Siap Disajikan
                                        </span>
                                        <span className="px-2 py-1 rounded-lg bg-neutral-100 text-neutral-700 font-semibold text-[10px] flex items-center gap-1">
                                            <Receipt className="w-3 h-3" /> Cetak Struk
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-neutral-500">
                                    Struk thermal Bluetooth otomatis terformat rapi dengan logo & footer resto.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </section>

            {/* Fitur Utama Grid (6 Cards Lengkap) */}
            <section id="fitur" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-neutral-200/60">
                <div className="text-center max-w-md mx-auto mb-12">
                    <span className="text-xs font-mono uppercase tracking-wider text-orange-600 font-bold">
                        Fitur Unggulan
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] mt-1.5">
                        Lengkap untuk Dine-In & Delivery
                    </h2>
                    <p className="text-xs text-neutral-500 mt-2">
                        Dirancang khusus untuk operasional resto, kafe, dan warkop tanpa ribet
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Feature 1 */}
                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-orange-300 transition-colors flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1.5">Peta GPS & Ongkir Otomatis</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Peta OpenStreetMap gratis tanpa biaya API key. Hitung jarak km presisi dengan batas jarak gratis ongkir yang bisa disetel di dashboard.
                            </p>
                        </div>
                        <span className="mt-4 text-[11px] font-bold text-orange-600 flex items-center gap-1">
                            Radius Gratis Ongkir Fleksibel →
                        </span>
                    </div>

                    {/* Feature 2 */}
                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-orange-300 transition-colors flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                                <Bike className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1.5">Pelacakan Status 4-Tahap</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Pelanggan dapat memantau status secara langsung: Pesanan Masuk, Dimasak Dapur, Diantar Kurir, hingga Pesanan Selesai.
                            </p>
                        </div>
                        <span className="mt-4 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            Live Progress Bar Realtime →
                        </span>
                    </div>

                    {/* Feature 3 */}
                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-orange-300 transition-colors flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1.5">Chat Kurir & Resto</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Komunikasi dua arah langsung di dalam aplikasi antara pelanggan dan kurir/kasir tanpa perlu saling simpan nomor HP.
                            </p>
                        </div>
                        <span className="mt-4 text-[11px] font-bold text-blue-600 flex items-center gap-1">
                            Plus Shortcut WhatsApp Darurat →
                        </span>
                    </div>

                    {/* Feature 4 */}
                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-orange-300 transition-colors flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                                <QrCode className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1.5">QR Meja Mandiri (Dine-In)</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Generate QR meja unik untuk masing-masing meja makan. Pelanggan cukup scan dengan kamera HP untuk memilih menu dan pesan.
                            </p>
                        </div>
                        <span className="mt-4 text-[11px] font-bold text-purple-600 flex items-center gap-1">
                            Tanpa Download Aplikasi Apapun →
                        </span>
                    </div>

                    {/* Feature 5 */}
                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-orange-300 transition-colors flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1.5">Cetak Struk Kasir Bluetooth</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Cetak nota dan struk belanja rapi beresolusi tinggi langsung ke printer thermal Bluetooth atau unduh langsung oleh pelanggan.
                            </p>
                        </div>
                        <span className="mt-4 text-[11px] font-bold text-amber-700 flex items-center gap-1">
                            Format Rapi Siap Cetak →
                        </span>
                    </div>

                    {/* Feature 6 */}
                    <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-orange-300 transition-colors flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-sm text-[#171717] mb-1.5">Laporan Omset & Menu</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                Pantau grafik omset harian, jumlah transaksi sukses, dan kelola foto menu makanan/minuman serta kategori dalam satu dashboard.
                            </p>
                        </div>
                        <span className="mt-4 text-[11px] font-bold text-purple-700 flex items-center gap-1">
                            Laporan Keuangan Rapi →
                        </span>
                    </div>
                </div>
            </section>

            {/* Cara Kerja 3 Langkah */}
            <section id="cara-kerja" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-neutral-200/60">
                <div className="text-center max-w-md mx-auto mb-12">
                    <span className="text-xs font-mono uppercase tracking-wider text-orange-600 font-bold">
                        Alur Pemesanan
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] mt-1.5">
                        3 Langkah Mudah & Praktis
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs relative">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm mb-4">
                            1
                        </div>
                        <h4 className="font-bold text-sm text-[#171717] mb-1.5">Pelanggan Buka Menu</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                            Bisa scan QR stiker di meja untuk makan di tempat, atau klik link toko online dari rumah via WhatsApp / Instagram.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs relative">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-sm mb-4">
                            2
                        </div>
                        <h4 className="font-bold text-sm text-[#171717] mb-1.5">Pilih Menu & Titik Antar</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                            Pilih makanan/minuman, tentukan titik lokasi peta untuk pesan antar (ongkir otomatis terhitung), lalu selesaikan pesanan dengan mudah.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-2xl border border-neutral-200/80 shadow-xs relative">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm mb-4">
                            3
                        </div>
                        <h4 className="font-bold text-sm text-[#171717] mb-1.5">Dapur & Kurir Proses</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                            Kasir menerima pesanan realtime, dapur memasak hidangan, dan kurir langsung klik rute Google Maps untuk mengantar tepat waktu.
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ Accordion */}
            <section id="faq" className="py-16 px-4 sm:px-6 max-w-3xl mx-auto border-t border-neutral-200/60">
                <div className="text-center mb-10">
                    <span className="text-xs font-mono uppercase tracking-wider text-orange-600 font-bold">
                        Bantuan & FAQ
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] mt-1.5">
                        Pertanyaan Sering Diajukan
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
                <div className="max-w-5xl mx-auto bg-[#171717] text-white rounded-3xl p-8 sm:p-14 text-center shadow-xl">
                    <img src="/logo.png" alt="eMakan" className="w-14 h-14 rounded-2xl mx-auto mb-4 shadow-lg shadow-black/40" />
                    <h2 className="text-2xl sm:text-4xl font-black mb-3">
                        Tingkatkan Penjualan Resto Anda Hari Ini
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-300 max-w-lg mx-auto mb-8 leading-relaxed font-light">
                        Gabungkan kemudahan Dine-In QR Meja dan Pesan Antar Online dalam satu sistem kasir modern tanpa biaya komisi pihak ketiga.
                    </p>
                    <button
                        onClick={() => navigate(isAuthenticated ? '/admin' : '/admin/login')}
                        className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-orange-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                        <span>{isAuthenticated ? 'Masuk ke Dashboard Kasir' : 'Daftar Sekarang (Sign Up)'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-[11px] text-neutral-400 mt-3">
                        Langsung aktif dalam hitungan detik • Tidak perlu konfigurasi server rumit
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 sm:px-6 bg-white border-t border-neutral-200/80 text-center text-xs text-neutral-400">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="eMakan" className="w-5 h-5 rounded-md" />
                        <span className="font-bold text-neutral-800">eMakan</span>
                        <span>• Sistem Kasir, QR Meja & Delivery Online Restoran</span>
                    </div>
                    <div>
                        © {CURRENT_YEAR} eMakan POS Platform. Semua hak dilindungi.
                    </div>
                </div>
            </footer>

        </div>
    );
}
