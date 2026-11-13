import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../../components/ui/Spinner';
import {
    getPayhookConfig,
    savePayhookConfig,
    confirmPayhookPayment,
} from '../../services/payhookService';
import {
    Shield,
    DollarSign,
    Store,
    ShoppingBag,
    QrCode,
    CheckCircle2,
    Clock,
    RefreshCw,
    Search,
    ExternalLink,
    Save,
    Terminal,
    ArrowUpRight,
    LogOut,
    Motorbike,
    Utensils,
    Copy,
    Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MasterPortalPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview'); // overview, orders, stores, payhook, users
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Global Data
    const [orders, setOrders] = useState([]);
    const [stores, setStores] = useState([]);
    const [usersList, setUsersList] = useState([]);

    // Payhook config state
    const [payhookConfig, setPayhookConfig] = useState(getPayhookConfig());
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [copiedField, setCopiedField] = useState('');

    // Search filters
    const [searchOrder, setSearchOrder] = useState('');
    const [searchStore, setSearchStore] = useState('');

    const fetchAllData = async () => {
        try {
            setRefreshing(true);
            const [ordersRes, storesRes, usersRes] = await Promise.all([
                supabase.from('orders').select('*').order('createdAt', { ascending: false }).limit(100),
                supabase.from('stores').select('*').order('created_at', { ascending: false }),
                supabase.from('users').select('*').order('created_at', { ascending: false }),
            ]);

            if (ordersRes.data) setOrders(ordersRes.data);
            if (storesRes.data) setStores(storesRes.data);
            if (usersRes.data) setUsersList(usersRes.data);
        } catch (err) {
            console.error('Failed to fetch master data:', err);
            toast.error('Gagal memuat data master portal');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Master Stats
    const totalRevenue = orders
        .filter((o) => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

    const pendingPayhookOrders = orders.filter(
        (o) => o.paymentStatus !== 'paid' && o.paymentMethod !== 'cash'
    );

    const handleSavePayhookConfig = (e) => {
        e.preventDefault();
        setIsSavingConfig(true);
        try {
            savePayhookConfig(payhookConfig);
            toast.success('Konfigurasi Payhook QRIS berhasil disimpan! 💳');
        } catch {
            toast.error('Gagal menyimpan konfigurasi');
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleVerifyPayment = async (orderId, amount) => {
        const toastId = toast.loading('Memverifikasi pembayaran Payhook...');
        try {
            await confirmPayhookPayment(orderId, amount);
            toast.success('Pembayaran QRIS Diverifikasi LUNAS! ✅', { id: toastId });
            fetchAllData();
        } catch (err) {
            toast.error('Gagal verifikasi: ' + err.message, { id: toastId });
        }
    };

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success('Disalin ke clipboard');
        setTimeout(() => setCopiedField(''), 2000);
    };

    const handleMasterLogout = () => {
        sessionStorage.removeItem('emakan_master_authenticated_session');
        window.location.href = '/admin';
    };

    const filteredOrders = orders.filter((o) => {
        const query = searchOrder.toLowerCase();
        return (
            o.id?.toLowerCase().includes(query) ||
            o.customerName?.toLowerCase().includes(query) ||
            o.tableNumber?.toLowerCase().includes(query)
        );
    });

    const filteredStores = stores.filter((s) => {
        const query = searchStore.toLowerCase();
        return (
            s.name?.toLowerCase().includes(query) ||
            s.id?.toLowerCase().includes(query) ||
            s.address?.toLowerCase().includes(query)
        );
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Spinner text="Menghubungkan ke Platform Master..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-indigo-500/20 px-4 lg:px-8 py-3.5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black text-white tracking-wide">
                                    MASTER CONTROL PORTAL
                                </h1>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    SUPERADMIN
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Multi-Store Platform Console • Logged in as <span className="text-indigo-400 font-mono font-medium">{user?.email}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={fetchAllData}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh Data</span>
                        </button>

                        <button
                            onClick={handleMasterLogout}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Kunci Portal</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
                    {[
                        { id: 'overview', label: '📊 Ringkasan & GMV' },
                        { id: 'payhook', label: '⚡ Payhook QRIS Hub' },
                        { id: 'orders', label: `📦 Transaksi Global (${orders.length})` },
                        { id: 'stores', label: `🏪 Merchant & Toko (${stores.length})` },
                        { id: 'users', label: `👥 User & RBAC (${usersList.length})` },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                activeTab === tab.id
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
                {/* 1. TAB OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-400 font-medium">Platform GMV (Lunas)</span>
                                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-white">
                                    Rp {totalRevenue.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-[11px] text-green-400 mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Akumulasi seluruh resto aktif
                                </p>
                            </div>

                            <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-400 font-medium">Total Toko / Cabang</span>
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                        <Store className="w-5 h-5" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-white">{stores.length}</h3>
                                <p className="text-[11px] text-indigo-400 mt-1">Multi-tenant stores terdaftar</p>
                            </div>

                            <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-400 font-medium">Total Seluruh Pesanan</span>
                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                        <ShoppingBag className="w-5 h-5" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-white">{orders.length}</h3>
                                <p className="text-[11px] text-slate-400 mt-1">Dine-in & Online Delivery</p>
                            </div>

                            <div className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-5 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-400 font-medium">Pending Payhook QRIS</span>
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-amber-400">
                                    {pendingPayhookOrders.length}
                                </h3>
                                <p className="text-[11px] text-amber-400/80 mt-1">Menunggu mutasi / konfirmasi</p>
                            </div>
                        </div>

                        {/* Recent Activity Quick View */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Live Pending QRIS Box */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                                        <h2 className="font-bold text-white text-sm">Menunggu Konfirmasi Payhook</h2>
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono">Realtime feed</span>
                                </div>

                                {pendingPayhookOrders.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 text-xs">
                                        Tidak ada pesanan QRIS yang sedang pending. Semua sudah lunas! ✨
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingPayhookOrders.slice(0, 5).map((order) => (
                                            <div
                                                key={order.id}
                                                className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-indigo-400 font-bold">
                                                            #{order.id.slice(0, 8)}
                                                        </span>
                                                        <span className="text-xs text-white font-medium">
                                                            {order.customerName}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        Nominal: <span className="font-bold text-emerald-400">Rp {Number(order.totalPrice).toLocaleString('id-ID')}</span> • {order.orderType === 'delivery' ? '🛵 Antar' : '🍽️ Dine-in'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleVerifyPayment(order.id, order.totalPrice)}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Set Lunas
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Store Quick List */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-bold text-white text-sm">Toko Terdaftar Terkini</h2>
                                    <button
                                        onClick={() => setActiveTab('stores')}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                    >
                                        Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {stores.slice(0, 5).map((store) => (
                                        <div
                                            key={store.id}
                                            className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-sm">
                                                    {store.name?.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">{store.name}</p>
                                                    <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                                        {store.address || 'Alamat belum diisi'}
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={`/order/${store.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                                title="Buka Menu Pelanggan"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. TAB PAYHOOK QRIS HUB */}
                {activeTab === 'payhook' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Config Form (2 Cols) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-900/90 border border-indigo-500/20 rounded-2xl p-6 shadow-xl">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            <QrCode className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-white">
                                                Konfigurasi Payhook QRIS Gateway
                                            </h2>
                                            <p className="text-xs text-slate-400">
                                                Kelola merchant QRIS statis & dinamis buatan sendiri
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                        Active Direct Mode
                                    </span>
                                </div>

                                <form onSubmit={handleSavePayhookConfig} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                                Nama Merchant QRIS
                                            </label>
                                            <input
                                                type="text"
                                                value={payhookConfig.merchantName}
                                                onChange={(e) =>
                                                    setPayhookConfig({
                                                        ...payhookConfig,
                                                        merchantName: e.target.value,
                                                    })
                                                }
                                                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                                NMID (National Merchant ID)
                                            </label>
                                            <input
                                                type="text"
                                                value={payhookConfig.nmid}
                                                onChange={(e) =>
                                                    setPayhookConfig({
                                                        ...payhookConfig,
                                                        nmid: e.target.value,
                                                    })
                                                }
                                                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                            Alamat / Lokasi Merchant
                                        </label>
                                        <input
                                            type="text"
                                            value={payhookConfig.address}
                                            onChange={(e) =>
                                                setPayhookConfig({
                                                    ...payhookConfig,
                                                    address: e.target.value,
                                                })
                                            }
                                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                            File Gambar QRIS (Public URL / Path)
                                        </label>
                                        <input
                                            type="text"
                                            value={payhookConfig.qrisImageUrl}
                                            onChange={(e) =>
                                                setPayhookConfig({
                                                    ...payhookConfig,
                                                    qrisImageUrl: e.target.value,
                                                })
                                            }
                                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                            required
                                        />
                                    </div>

                                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-white">
                                                    Sertakan 2-Digit Kode Unik Transaksi
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    Menambahkan Rp 11 s/d Rp 99 agar mutasi bank/QRIS mudah dicocokkan otomatis oleh bot
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={payhookConfig.useUniqueCode}
                                                onChange={(e) =>
                                                    setPayhookConfig({
                                                        ...payhookConfig,
                                                        useUniqueCode: e.target.checked,
                                                    })
                                                }
                                                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSavingConfig}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Save className="w-4 h-4" />
                                            {isSavingConfig ? 'Menyimpan...' : 'Simpan Perubahan QRIS'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Webhook Developer Guide */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <Terminal className="w-5 h-5 text-indigo-400" />
                                    <h3 className="text-sm font-bold text-white">
                                        Panduan Webhook Payhook (Bot Notifier / Mutasi)
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                    Integrasikan webhook listener dari mutasi bank (misal BCA/BRI/BSI/Mandiri atau QRIS bot). Kirim POST JSON ke backend atau panggil fungsi konfirmasi:
                                </p>
                                <div className="bg-slate-950 p-4 rounded-xl font-mono text-[11px] text-indigo-300 border border-slate-800 overflow-x-auto relative">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleCopy(
                                                `{\n  "event": "payment.success",\n  "order_id": "ORD-123456",\n  "amount_paid": 35027,\n  "nmid": "${payhookConfig.nmid}",\n  "signature": "ph_sig_verified"\n}`,
                                                'webhook'
                                            )
                                        }
                                        className="absolute top-3 right-3 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                                    >
                                        {copiedField === 'webhook' ? (
                                            <Check className="w-3 h-3 text-green-400" />
                                        ) : (
                                            <Copy className="w-3 h-3" />
                                        )}
                                        {copiedField === 'webhook' ? 'Tersalin' : 'Copy JSON'}
                                    </button>
                                    <pre>{`// Contoh Payload Webhook Masuk (Payhook)
{
  "event": "payment.success",
  "order_id": "ORD-123456",
  "amount_paid": 35027,
  "nmid": "${payhookConfig.nmid}",
  "signature": "ph_sig_verified"
}`}</pre>
                                </div>
                            </div>
                        </div>

                        {/* Customer QRIS Preview Card (1 Col) */}
                        <div className="space-y-4">
                            <div className="bg-slate-900/90 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3 text-center">
                                    Preview Tampilan QRIS Pelanggan
                                </span>

                                <div className="bg-white rounded-2xl p-4 shadow-xl text-slate-900 border border-slate-200">
                                    <div className="text-center pb-3 border-b border-dashed border-slate-200">
                                        <p className="text-xs font-bold uppercase tracking-tight text-slate-900">
                                            {payhookConfig.merchantName}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            {payhookConfig.address}
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-600 mt-1 font-semibold">
                                            NMID: {payhookConfig.nmid}
                                        </p>
                                    </div>

                                    <div className="my-3 flex justify-center bg-slate-50 p-2 rounded-xl">
                                        <img
                                            src={payhookConfig.qrisImageUrl}
                                            alt="QRIS Merchant"
                                            className="w-48 h-48 object-contain rounded-lg shadow-sm"
                                            onError={(e) => {
                                                e.target.src = '/logo.png';
                                            }}
                                        />
                                    </div>

                                    <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
                                        <p className="text-[11px] text-indigo-700 font-medium">Contoh Tagihan Unik:</p>
                                        <p className="text-base font-black text-indigo-900 font-mono">
                                            Rp 35.042
                                        </p>
                                        <p className="text-[9px] text-indigo-500 mt-0.5">
                                            Termasuk 2-digit kode unik verifikasi otomatis
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                                    💡 QRIS ini langsung muncul di halaman status pesanan pembeli setelah klik Bayar Sekarang.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. TAB TRANSAKSI GLOBAL (ALL ORDERS) */}
                {activeTab === 'orders' && (
                    <div className="bg-slate-900/90 border border-indigo-500/20 rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                            <div>
                                <h2 className="text-base font-bold text-white">Stream Transaksi Global</h2>
                                <p className="text-xs text-slate-400">
                                    Seluruh pesanan dari semua cabang warkop/resto eMakan
                                </p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                                <input
                                    type="text"
                                    placeholder="Cari ID, Pelanggan, Meja..."
                                    value={searchOrder}
                                    onChange={(e) => setSearchOrder(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                                        <th className="py-3 px-3">Order ID</th>
                                        <th className="py-3 px-3">Pelanggan</th>
                                        <th className="py-3 px-3">Tipe</th>
                                        <th className="py-3 px-3">Total Tagihan</th>
                                        <th className="py-3 px-3">Status Bayar</th>
                                        <th className="py-3 px-3">Waktu</th>
                                        <th className="py-3 px-3 text-right">Aksi Superadmin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-slate-500">
                                                Tidak ada pesanan ditemukan
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((order) => {
                                            const isPaid = order.paymentStatus === 'paid';
                                            return (
                                                <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3 px-3 font-mono font-bold text-indigo-400">
                                                        #{order.id.slice(0, 8)}
                                                    </td>
                                                    <td className="py-3 px-3 font-medium text-white">
                                                        {order.customerName}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                                            {order.orderType === 'delivery' ? (
                                                                <>
                                                                    <Motorbike className="w-3 h-3 text-orange-400" /> Antar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Utensils className="w-3 h-3 text-blue-400" /> Meja {order.tableNumber || '-'}
                                                                </>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                                                        Rp {Number(order.totalPrice).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {isPaid ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                                                <CheckCircle2 className="w-3 h-3" /> Lunas
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                <Clock className="w-3 h-3" /> Menunggu Bayar
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                                                        {order.createdAt
                                                            ? new Date(order.createdAt).toLocaleTimeString('id-ID', {
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                              })
                                                            : '-'}
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        {!isPaid ? (
                                                            <button
                                                                onClick={() => handleVerifyPayment(order.id, order.totalPrice)}
                                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-md shadow-emerald-600/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Verifikasi Payhook
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-500">
                                                                Terverifikasi ✓
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. TAB TOKO & MERCHANT (STORES) */}
                {activeTab === 'stores' && (
                    <div className="bg-slate-900/90 border border-indigo-500/20 rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                            <div>
                                <h2 className="text-base font-bold text-white">Direktori Toko & Merchant</h2>
                                <p className="text-xs text-slate-400">
                                    Daftar toko/warkop yang terdaftar pada platform eMakan
                                </p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                                <input
                                    type="text"
                                    placeholder="Cari Toko atau ID..."
                                    value={searchStore}
                                    onChange={(e) => setSearchStore(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStores.map((store) => (
                                <div
                                    key={store.id}
                                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/40 transition-all shadow-lg flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
                                                {store.name?.slice(0, 2).toUpperCase()}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                                Active
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-white text-sm mb-1">{store.name}</h3>
                                        <p className="text-slate-400 text-xs mb-3 line-clamp-2">
                                            {store.address || 'Alamat toko belum diatur'}
                                        </p>
                                        <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                                            <p className="truncate">Store ID: {store.id}</p>
                                            <p>WA: {store.whatsappNumber || '-'}</p>
                                            <p>
                                                Ongkir Gratis: {store.freeDistanceKm ?? 5} km (Max {store.maxDeliveryKm ?? 20} km)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                                        <a
                                            href={`/order/${store.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            Buka Menu Customer <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. TAB USERS & RBAC */}
                {activeTab === 'users' && (
                    <div className="bg-slate-900/90 border border-indigo-500/20 rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="pb-4 border-b border-slate-800">
                            <h2 className="text-base font-bold text-white">Manajemen Akun & Otoritas (RBAC)</h2>
                            <p className="text-xs text-slate-400">
                                Pengguna sistem, peran hak akses, dan keterkaitan toko
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                                        <th className="py-3 px-3">Email Pengguna</th>
                                        <th className="py-3 px-3">Role Otoritas</th>
                                        <th className="py-3 px-3">Store ID Terkait</th>
                                        <th className="py-3 px-3">Terdaftar Pada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {usersList.map((u) => {
                                        const isMaster =
                                            u.role === 'master_admin' ||
                                            u.email === 'rafif.muh.anwar@gmail.com';
                                        return (
                                            <tr key={u.id} className="hover:bg-slate-800/40">
                                                <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                                                    {isMaster && (
                                                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                                                    )}
                                                    {u.email}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span
                                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                            isMaster
                                                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                                                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                                        }`}
                                                    >
                                                        {isMaster ? '👑 MASTER ADMIN' : 'Store Admin'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                                                    {u.store_id || '-'}
                                                </td>
                                                <td className="py-3 px-3 text-slate-400 text-[11px]">
                                                    {u.created_at
                                                        ? new Date(u.created_at).toLocaleDateString('id-ID')
                                                        : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
