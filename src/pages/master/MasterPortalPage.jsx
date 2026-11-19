import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../../components/ui/Spinner';
import {
    getPayhookConfig,
    savePayhookConfig,
    confirmPayhookPayment,
    pingPayhookWebhook,
    simulatePayhookNotification,
} from '../../services/payhookService';
import { updateWithdrawalStatus } from '../../services/walletService';
import {
    generateDynamicQris,
    MASTER_QRIS_STATIC,
} from '../../utils/qrisUtils';
import { QRCodeSVG } from 'qrcode.react';
import {
    Shield,
    DollarSign,
    Store,
    ShoppingBag,
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
    Activity,
    Smartphone,
    Send,
    Key,
    Server,
    CreditCard,
    Layers,
    Users,
    Info,
    ChevronRight,
    Wallet,
    AlertCircle,
    XCircle,
    CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MasterPortalPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview'); // overview, payhook, orders, stores, users
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
    const [searchWithdrawal, setSearchWithdrawal] = useState('');
    const [withdrawalFilter, setWithdrawalFilter] = useState('all'); // all, pending, completed, rejected

    // Webhook actions
    const [isPinging, setIsPinging] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [liveAmount, setLiveAmount] = useState(50123);

    const webhookFullUrl = `${window.location.origin}/api/payment/qris/webhook`;

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

    // Escrow & Withdrawals Data Aggregation
    const allWithdrawals = useMemo(() => {
        const list = [];
        stores.forEach((s) => {
            let extra = {};
            if (s.address && typeof s.address === 'string' && s.address.startsWith('{')) {
                try {
                    extra = JSON.parse(s.address);
                } catch {
                    extra = {};
                }
            }
            const storeWithdrawals = Array.isArray(extra.withdrawals) ? extra.withdrawals : [];
            storeWithdrawals.forEach((w) => {
                list.push({
                    ...w,
                    storeName: s.name || 'Cabang Resto',
                    storeId: s.id,
                });
            });
        });
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [stores]);

    const pendingWithdrawals = useMemo(() => {
        return allWithdrawals.filter((w) => w.status === 'pending');
    }, [allWithdrawals]);

    const completedWithdrawals = useMemo(() => {
        return allWithdrawals.filter((w) => w.status === 'completed');
    }, [allWithdrawals]);

    const rejectedWithdrawals = useMemo(() => {
        return allWithdrawals.filter((w) => w.status === 'rejected');
    }, [allWithdrawals]);

    const totalPendingPayout = useMemo(() => {
        return pendingWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    }, [pendingWithdrawals]);

    const totalCompletedPayout = useMemo(() => {
        return completedWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    }, [completedWithdrawals]);

    const filteredWithdrawals = useMemo(() => {
        return allWithdrawals.filter((w) => {
            if (withdrawalFilter !== 'all' && w.status !== withdrawalFilter) {
                return false;
            }
            if (!searchWithdrawal) return true;
            const query = searchWithdrawal.toLowerCase();
            return (
                w.id?.toLowerCase().includes(query) ||
                w.storeName?.toLowerCase().includes(query) ||
                w.bankName?.toLowerCase().includes(query) ||
                w.accountNumber?.toLowerCase().includes(query) ||
                w.accountHolder?.toLowerCase().includes(query)
            );
        });
    }, [allWithdrawals, withdrawalFilter, searchWithdrawal]);

    const handleCompleteWithdrawal = async (storeId, withdrawalId) => {
        const confirmTransfer = window.confirm(
            'Apakah dana transfer pencairan sudah berhasil dikirimkan ke rekening merchant?\\n\\nKlik OK untuk menandai pencairan ini sebagai SELESAI.'
        );
        if (!confirmTransfer) return;

        const toastId = toast.loading('Memproses konfirmasi pencairan...');
        try {
            await updateWithdrawalStatus(storeId, withdrawalId, 'completed');
            toast.success('Pencairan berhasil ditandai selesai!', { id: toastId });
            await fetchAllData();
        } catch (err) {
            toast.error(err.message || 'Gagal memperbarui status penarikan', { id: toastId });
        }
    };

    const handleRejectWithdrawal = async (storeId, withdrawalId) => {
        const reason = window.prompt('Masukkan alasan penolakan pencairan (misal: Nomor Rekening Tidak Valid):');
        if (reason === null) return;

        const toastId = toast.loading('Memproses penolakan pencairan...');
        try {
            await updateWithdrawalStatus(storeId, withdrawalId, 'rejected', reason || 'Ditolak oleh Superadmin');
            toast.success('Pengajuan ditolak & saldo dikembalikan ke resto', { id: toastId });
            await fetchAllData();
        } catch (err) {
            toast.error(err.message || 'Gagal menolak penarikan', { id: toastId });
        }
    };

    const handleSavePayhookConfig = (e) => {
        e.preventDefault();
        setIsSavingConfig(true);
        try {
            savePayhookConfig(payhookConfig);
            toast.success('Konfigurasi Payhook QRIS berhasil disimpan');
        } catch {
            toast.error('Gagal menyimpan konfigurasi');
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleVerifyPayment = async (orderId, amount) => {
        const toastId = toast.loading('Memverifikasi status lunas...');
        try {
            await confirmPayhookPayment(orderId, amount);
            toast.success('Pembayaran QRIS Diverifikasi LUNAS', { id: toastId });
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

    const handlePingConnection = async () => {
        setIsPinging(true);
        const toastId = toast.loading('Menguji respons serverless webhook...');
        try {
            const res = await pingPayhookWebhook(payhookConfig.secretKey);
            toast.success(res.message || 'Koneksi Serverless Payhook OK (200)', { id: toastId });
        } catch (err) {
            toast.error(err.message || 'Gagal ping webhook', { id: toastId });
        } finally {
            setIsPinging(false);
        }
    };

    const handleSimulatePayment = async (amount = 50123) => {
        setIsSimulating(true);
        const toastId = toast.loading(`Mengirim simulasi mutasi masuk Rp ${Number(amount).toLocaleString('id-ID')}...`);
        try {
            const res = await simulatePayhookNotification(amount, payhookConfig.secretKey);
            if (res.status === 'verified') {
                toast.success(res.message, { id: toastId });
                fetchAllData();
            } else {
                toast(res.message, { id: toastId });
            }
        } catch (err) {
            toast.error(err.message || 'Gagal simulasi', { id: toastId });
        } finally {
            setIsSimulating(false);
        }
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
            <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
                <Spinner text="Menghubungkan ke Master Platform..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans selection:bg-slate-700 selection:text-white pb-20">
            {/* Top Navigation Bar - Clean, Technical & Professional */}
            <header className="sticky top-0 z-40 bg-[#0e1422]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
                            <Shield className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white tracking-tight">
                                    Platform Master Console
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    SUPERADMIN
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Multi-Tenant POS • Logged in as <span className="text-slate-300 font-mono">{user?.email}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Sistem Normal</span>
                        </div>

                        <button
                            onClick={fetchAllData}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-xs font-medium text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
                            <span className="hidden sm:inline">Refresh Data</span>
                        </button>

                        <button
                            onClick={handleMasterLogout}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-xs font-medium text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/50 transition-colors cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Kunci Portal</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs - Modern Segmented Control */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="flex items-center gap-1.5 p-1 bg-[#0e1422] rounded-xl border border-slate-800/80 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Ringkasan Platform', icon: Layers },
                        {
                            id: 'withdrawals',
                            label: `Penarikan Saldo ${pendingWithdrawals.length > 0 ? `(${pendingWithdrawals.length} Baru)` : `(${allWithdrawals.length})`}`,
                            icon: Wallet,
                            badge: pendingWithdrawals.length > 0 ? pendingWithdrawals.length : null,
                        },
                        { id: 'payhook', label: 'Payhook QRIS Hub', icon: CreditCard },
                        { id: 'orders', label: `Transaksi Global (${orders.length})`, icon: ShoppingBag },
                        { id: 'stores', label: `Merchant Toko (${stores.length})`, icon: Store },
                        { id: 'users', label: `Pengguna & RBAC (${usersList.length})`, icon: Users },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                    isActive
                                        ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {/* 1. TAB OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-medium">Platform GMV (Lunas)</span>
                                    <DollarSign className="w-4 h-4 text-emerald-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">
                                    Rp {totalRevenue.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>Akumulasi omset dari seluruh cabang</span>
                                </p>
                            </div>

                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-medium">Total Merchant Toko</span>
                                    <Store className="w-4 h-4 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">{stores.length}</h3>
                                <p className="text-[11px] text-slate-400 mt-2">
                                    Tenant aktif terdaftar di database
                                </p>
                            </div>

                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-medium">Total Pesanan</span>
                                    <ShoppingBag className="w-4 h-4 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">{orders.length}</h3>
                                <p className="text-[11px] text-slate-400 mt-2">
                                    Dine-in dan online delivery
                                </p>
                            </div>

                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-medium">Pending Penarikan</span>
                                    <Wallet className="w-4 h-4 text-amber-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-amber-400 tracking-tight">
                                    Rp {totalPendingPayout.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-[11px] text-amber-400 mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                    <span>{pendingWithdrawals.length} pengajuan perlu ditransfer</span>
                                </p>
                            </div>

                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-medium">Antrean QRIS Pending</span>
                                    <Clock className="w-4 h-4 text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-300 tracking-tight">
                                    {pendingPayhookOrders.length}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-2">
                                    Menunggu notifikasi mutasi QRIS
                                </p>
                            </div>
                        </div>

                        {/* Recent Activity Quick View */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Live Pending QRIS Box */}
                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                                    <div>
                                        <h2 className="font-semibold text-white text-sm">Menunggu Konfirmasi Payhook</h2>
                                        <p className="text-[11px] text-slate-400">Pesanan belum lunas yang siap dicocokkan mutasi</p>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        {pendingPayhookOrders.length} Pending
                                    </span>
                                </div>

                                {pendingPayhookOrders.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 text-xs">
                                        Tidak ada pesanan QRIS yang sedang pending. Semua sudah lunas.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {pendingPayhookOrders.slice(0, 5).map((order) => (
                                            <div
                                                key={order.id}
                                                className="bg-[#090d16] border border-slate-800/80 p-3.5 rounded-lg flex items-center justify-between gap-3"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-slate-300 font-semibold">
                                                            #{order.id.slice(0, 8)}
                                                        </span>
                                                        <span className="text-xs text-white">
                                                            {order.customerName}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        Total: <span className="font-semibold text-emerald-400">Rp {Number(order.totalPrice).toLocaleString('id-ID')}</span> • {order.orderType === 'delivery' ? 'Antar' : 'Dine-in'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleVerifyPayment(order.id, order.totalPrice)}
                                                    className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
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
                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                                    <div>
                                        <h2 className="font-semibold text-white text-sm">Daftar Merchant Terdaftar</h2>
                                        <p className="text-[11px] text-slate-400">Cabang dan outlet yang aktif dalam sistem</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('stores')}
                                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                    >
                                        Semua <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="space-y-2.5">
                                    {stores.slice(0, 5).map((store) => (
                                        <div
                                            key={store.id}
                                            className="bg-[#090d16] border border-slate-800/80 p-3 rounded-lg flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-700">
                                                    {store.name?.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-white">{store.name}</p>
                                                    <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                                        {store.address || 'Alamat belum diisi'}
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={`/order/${store.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                                title="Buka Menu Pelanggan"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. TAB WITHDRAWALS / ESCROW SETTLEMENT */}
                {activeTab === 'withdrawals' && (
                    <div className="space-y-6">
                        {/* Escrow Quick KPI row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-medium">Menunggu Transfer (Pending)</span>
                                    <Clock className="w-4 h-4 text-amber-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-amber-400 tracking-tight">
                                    Rp {totalPendingPayout.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-2">
                                    {pendingWithdrawals.length} pengajuan pencairan dari merchant
                                </p>
                            </div>

                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-medium">Total Berhasil Ditransfer</span>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-emerald-400 tracking-tight">
                                    Rp {totalCompletedPayout.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-2">
                                    {completedWithdrawals.length} penarikan telah diselesaikan
                                </p>
                            </div>

                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5">
                                <div className="flex items-center justify-between text-slate-400 mb-2">
                                    <span className="text-xs font-medium">Total Riwayat Pengajuan</span>
                                    <Wallet className="w-4 h-4 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-bold text-white tracking-tight">
                                    {allWithdrawals.length}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-2">
                                    Semua transaksi penarikan toko terdaftar
                                </p>
                            </div>
                        </div>

                        {/* Withdrawals Table Card */}
                        <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                                <div>
                                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-emerald-400" />
                                        <span>Daftar Permintaan Pencairan Dana Merchant</span>
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Periksa nomor rekening tujuan, transfer via mobile banking, lalu tandai transfer selesai
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    {/* Filter Pills */}
                                    <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-lg border border-slate-800 text-xs">
                                        {[
                                            { id: 'all', label: `Semua (${allWithdrawals.length})` },
                                            { id: 'pending', label: `Pending (${pendingWithdrawals.length})` },
                                            { id: 'completed', label: `Selesai (${completedWithdrawals.length})` },
                                            { id: 'rejected', label: `Ditolak (${rejectedWithdrawals.length})` },
                                        ].map((f) => (
                                            <button
                                                key={f.id}
                                                onClick={() => setWithdrawalFilter(f.id)}
                                                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                                    withdrawalFilter === f.id
                                                        ? 'bg-slate-800 text-white shadow-xs'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative w-full sm:w-60">
                                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Cari toko, rekening, ID..."
                                            value={searchWithdrawal}
                                            onChange={(e) => setSearchWithdrawal(e.target.value)}
                                            className="w-full pl-9 pr-3 py-1.5 bg-[#090d16] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                                            <th className="py-2.5 px-3">ID & Waktu</th>
                                            <th className="py-2.5 px-3">Merchant Toko</th>
                                            <th className="py-2.5 px-3">Rekening Pencairan</th>
                                            <th className="py-2.5 px-3">Nominal Pencairan</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3 text-right">Tindakan Superadmin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {filteredWithdrawals.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-10 text-slate-500">
                                                    Tidak ada pengajuan pencairan dana yang cocok
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredWithdrawals.map((w) => {
                                                const isPending = w.status === 'pending';
                                                const isCompleted = w.status === 'completed';
                                                const isRejected = w.status === 'rejected';

                                                return (
                                                    <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-3 px-3">
                                                            <div className="font-mono font-medium text-slate-300">
                                                                {w.id}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500">
                                                                {w.createdAt
                                                                    ? new Date(w.createdAt).toLocaleString('id-ID', {
                                                                          day: 'numeric',
                                                                          month: 'short',
                                                                          year: 'numeric',
                                                                          hour: '2-digit',
                                                                          minute: '2-digit',
                                                                      })
                                                                    : '-'}
                                                            </div>
                                                        </td>

                                                        <td className="py-3 px-3">
                                                            <div className="font-semibold text-white">{w.storeName}</div>
                                                            <div className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                                                                {w.storeId}
                                                            </div>
                                                        </td>

                                                        <td className="py-3 px-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-semibold text-white">{w.bankName}</span>
                                                                <button
                                                                    onClick={() => handleCopy(w.accountNumber, w.id)}
                                                                    title="Salin Nomor Rekening"
                                                                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded cursor-pointer"
                                                                >
                                                                    {copiedField === w.id ? (
                                                                        <Check className="w-3 h-3 text-emerald-400" />
                                                                    ) : (
                                                                        <Copy className="w-3 h-3" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                            <div className="font-mono text-slate-300 tracking-wider">
                                                                {w.accountNumber}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400">
                                                                a.n. <span className="text-slate-200">{w.accountHolder}</span>
                                                            </div>
                                                        </td>

                                                        <td className="py-3 px-3">
                                                            <div className="font-mono text-sm font-bold text-emerald-400">
                                                                Rp {Number(w.amount || 0).toLocaleString('id-ID')}
                                                            </div>
                                                            {w.notes && (
                                                                <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={w.notes}>
                                                                    {w.notes}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="py-3 px-3">
                                                            {isPending && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                    <Clock className="w-3 h-3" /> Menunggu Transfer
                                                                </span>
                                                            )}
                                                            {isCompleted && (
                                                                <div>
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                        <CheckCircle2 className="w-3 h-3" /> Selesai Ditransfer
                                                                    </span>
                                                                    {w.completedAt && (
                                                                        <div className="text-[10px] text-slate-500 mt-1">
                                                                            {new Date(w.completedAt).toLocaleString('id-ID', {
                                                                                day: 'numeric',
                                                                                month: 'short',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {isRejected && (
                                                                <div>
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                                        <XCircle className="w-3 h-3" /> Ditolak
                                                                    </span>
                                                                    {w.rejectReason && (
                                                                        <div className="text-[10px] text-rose-300 mt-0.5 truncate max-w-[130px]" title={w.rejectReason}>
                                                                            {w.rejectReason}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="py-3 px-3 text-right">
                                                            {isPending ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handleCompleteWithdrawal(w.storeId, w.id)}
                                                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        <span>Tandai Selesai</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRejectWithdrawal(w.storeId, w.id)}
                                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/60 rounded-lg text-xs transition-colors cursor-pointer"
                                                                    >
                                                                        <span>Tolak</span>
                                                                    </button>
                                                                </div>
                                                            ) : isCompleted ? (
                                                                <span className="text-[11px] text-slate-500">
                                                                    Lunas terbayar
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-500">
                                                                    Saldo dikembalikan
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
                    </div>
                )}

                {/* 3. TAB PAYHOOK QRIS HUB - Clean Developer Console */}
                {activeTab === 'payhook' && (
                    <div className="space-y-6">
                        {/* Header Banner - Clean Developer Console Style */}
                        <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 sm:p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span>Serverless Webhook Endpoint Aktif</span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                        Pusat Webhook Payhook & QRIS Dinamis Serverless
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                                        Setiap mutasi masuk dari aplikasi m-Banking atau e-wallet (BCA, Mandiri, BRI, BNI, GoPay, DANA) yang ditangkap oleh forwarder Payhook di Android diproses otomatis untuk mencocokkan nominal transaksi.
                                    </p>
                                </div>

                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handlePingConnection}
                                        disabled={isPinging}
                                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Activity className={`w-3.5 h-3.5 text-emerald-400 ${isPinging ? 'animate-spin' : ''}`} />
                                        <span>{isPinging ? 'Menguji...' : 'Uji Ping Koneksi'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSimulatePayment(50123)}
                                        disabled={isSimulating}
                                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{isSimulating ? 'Memproses...' : 'Simulasi Masuk (Rp 50.123)'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Webhook Configuration Cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Card 1: Webhook URL */}
                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Server className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-300">
                                            1. URL Webhook
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                        METHOD: POST
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 bg-[#090d16] p-2 rounded-lg border border-slate-800">
                                    <input
                                        type="text"
                                        readOnly
                                        value={webhookFullUrl}
                                        className="flex-1 bg-transparent text-xs text-slate-200 font-mono outline-none px-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(webhookFullUrl, 'webhook_url')}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer shrink-0 border border-slate-700"
                                    >
                                        {copiedField === 'webhook_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedField === 'webhook_url' ? 'Tersalin' : 'Salin'}</span>
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Masukkan URL ini pada kolom Webhook URL di aplikasi Payhook Android.
                                </p>
                            </div>

                            {/* Card 2: Secret Key Header */}
                            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Key className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-300">
                                            2. Header Secret Key
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                        X-API-KEY
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 bg-[#090d16] p-2 rounded-lg border border-slate-800">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`x-api-key: ${payhookConfig.secretKey}`}
                                        className="flex-1 bg-transparent text-xs text-slate-200 font-mono outline-none px-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(payhookConfig.secretKey, 'secret_key')}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer shrink-0 border border-slate-700"
                                    >
                                        {copiedField === 'secret_key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedField === 'secret_key' ? 'Tersalin' : 'Salin'}</span>
                                    </button>
                                </div>

                                <div className="text-[11px] text-slate-400 font-mono bg-[#090d16] p-2 rounded-md border border-slate-800/80">
                                    Header: <span className="text-slate-200">x-api-key</span> | Value: <span className="text-emerald-400">{payhookConfig.secretKey}</span>
                                </div>
                            </div>
                        </div>

                        {/* 3 Langkah Praktis Setting Aplikasi Payhook di Android */}
                        <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-white">
                                    Panduan Konfigurasi Aplikasi Payhook Android
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Langkah cepat untuk mengaktifkan sinkronisasi otomatis mutasi bank
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                <div className="p-4 bg-[#090d16] border border-slate-800 rounded-lg">
                                    <div className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-mono font-semibold text-xs flex items-center justify-center mb-2.5 border border-slate-700">
                                        1
                                    </div>
                                    <h4 className="font-semibold text-white text-xs mb-1">Pilih Aplikasi Bank</h4>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        Buka Payhook di Android, centang aplikasi yang aktif menerima transfer: BCA, Mandiri, GoBiz / GoPay, atau DANA Bisnis.
                                    </p>
                                </div>

                                <div className="p-4 bg-[#090d16] border border-slate-800 rounded-lg">
                                    <div className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-mono font-semibold text-xs flex items-center justify-center mb-2.5 border border-slate-700">
                                        2
                                    </div>
                                    <h4 className="font-semibold text-white text-xs mb-1">Tempel Webhook URL</h4>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        Masukkan URL webhook sistem: <span className="text-slate-300 font-mono break-all">{webhookFullUrl}</span> pada kolom URL di aplikasi.
                                    </p>
                                </div>

                                <div className="p-4 bg-[#090d16] border border-slate-800 rounded-lg">
                                    <div className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-mono font-semibold text-xs flex items-center justify-center mb-2.5 border border-slate-700">
                                        3
                                    </div>
                                    <h4 className="font-semibold text-white text-xs mb-1">Isi Header Secret</h4>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        Di pengaturan Header tambahkan Name: <span className="text-slate-300 font-mono">x-api-key</span> dan Value: <span className="text-emerald-400 font-mono">{payhookConfig.secretKey}</span>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Barcode QRIS Master Platform (Dukungan QRIS Dinamis Otomatis) */}
                        <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-white">
                                            Generator QRIS Dinamis (EMVCo Tag 54 + CRC16)
                                        </h3>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Nominal Terkunci
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Nominal tagihan di-inject otomatis ke format QRIS standar nasional sehingga pelanggan tidak perlu input nominal manual saat transfer.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 bg-[#090d16] px-3 py-1.5 rounded-lg border border-slate-800">
                                    <span className="text-xs text-slate-400">Tes Nominal:</span>
                                    <div className="flex items-center gap-1 font-mono text-xs">
                                        <span className="text-slate-400">Rp</span>
                                        <input
                                            type="number"
                                            value={liveAmount}
                                            onChange={(e) => setLiveAmount(Number(e.target.value) || 0)}
                                            className="w-24 bg-transparent text-white font-semibold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
                                {/* QR Code Display (1 Col) */}
                                <div className="flex flex-col items-center justify-center p-5 bg-[#090d16] rounded-lg border border-slate-800">
                                    <div className="p-3.5 bg-white rounded-lg shadow-sm">
                                        <QRCodeSVG
                                            value={generateDynamicQris(payhookConfig.rawStaticQris || MASTER_QRIS_STATIC, liveAmount)}
                                            size={190}
                                            level="M"
                                            includeMargin={true}
                                            className="mx-auto"
                                        />
                                    </div>
                                    <div className="mt-3.5 text-center">
                                        <p className="text-xs font-semibold text-emerald-400 font-mono">
                                            Rp {Number(liveAmount).toLocaleString('id-ID')}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Scan via BCA / GoPay / DANA untuk verifikasi nominal terkunci
                                        </p>
                                    </div>
                                </div>

                                {/* Metadata Breakdown (2 Cols) */}
                                <div className="lg:col-span-2 space-y-3.5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div className="p-3 bg-[#090d16] rounded-lg border border-slate-800">
                                            <span className="text-[10px] text-slate-400 uppercase font-medium block">Merchant Terdaftar</span>
                                            <span className="font-semibold text-white text-xs mt-0.5 block">
                                                {payhookConfig.merchantName}
                                            </span>
                                            <span className="text-[11px] text-slate-400 mt-0.5 block truncate">
                                                {payhookConfig.address}
                                            </span>
                                        </div>

                                        <div className="p-3 bg-[#090d16] rounded-lg border border-slate-800">
                                            <span className="text-[10px] text-slate-400 uppercase font-medium block">NMID Nasional (ASPI)</span>
                                            <span className="font-mono text-xs font-semibold text-slate-200 mt-0.5 block">
                                                {payhookConfig.nmid}
                                            </span>
                                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                                                Provider: {payhookConfig.provider || 'GoPay / GoBiz Merchant'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-3.5 bg-[#090d16] rounded-lg border border-slate-800 space-y-1.5">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                                            <Info className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Mekanisme Tag 54 + Checksum CRC16</span>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Saat pesanan dibuat, sistem mengambil master QRIS statis dan menyisipkan Tag 54 (Transaction Amount) beserta perhitungan ulang checksum CRC16-CCITT standar EMVCo. Aplikasi mobile banking membaca tag ini sebagai QR Dinamis dan langsung mengunci jumlah pembayaran.
                                        </p>
                                    </div>

                                    {/* Raw EMVCo Payload Preview */}
                                    <div className="p-3 bg-[#090d16] rounded-lg border border-slate-800/80 font-mono text-[10px] text-slate-400">
                                        <span className="text-slate-400 block mb-1">Payload EMVCo Terkini:</span>
                                        <p className="break-all text-slate-300">
                                            {generateDynamicQris(payhookConfig.rawStaticQris || MASTER_QRIS_STATIC, liveAmount)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Editor Config Credentials */}
                        <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Kredensial & Konfigurasi Payhook</h3>
                                <p className="text-xs text-slate-400">Parameter merchant master untuk platform eMakan</p>
                            </div>
                            <form onSubmit={handleSavePayhookConfig} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <label className="block text-slate-400 mb-1 font-medium">Nama Merchant</label>
                                    <input
                                        type="text"
                                        value={payhookConfig.merchantName}
                                        onChange={(e) => setPayhookConfig({ ...payhookConfig, merchantName: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-lg text-white outline-none focus:border-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1 font-medium">NMID</label>
                                    <input
                                        type="text"
                                        value={payhookConfig.nmid}
                                        onChange={(e) => setPayhookConfig({ ...payhookConfig, nmid: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-lg text-white font-mono outline-none focus:border-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1 font-medium">Secret Key (x-api-key)</label>
                                    <input
                                        type="text"
                                        value={payhookConfig.secretKey}
                                        onChange={(e) => setPayhookConfig({ ...payhookConfig, secretKey: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-lg text-white font-mono outline-none focus:border-slate-600"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingConfig}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                                    >
                                        <Save className="w-3.5 h-3.5 text-slate-300" />
                                        <span>{isSavingConfig ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 3. TAB TRANSAKSI GLOBAL (ALL ORDERS) */}
                {activeTab === 'orders' && (
                    <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Stream Transaksi Seluruh Merchant</h2>
                                <p className="text-xs text-slate-400">
                                    Daftar pesanan realtime dari semua cabang resto
                                </p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Cari ID, Pelanggan, Meja..."
                                    value={searchOrder}
                                    onChange={(e) => setSearchOrder(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-[#090d16] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-600"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                                        <th className="py-2.5 px-3">Order ID</th>
                                        <th className="py-2.5 px-3">Pelanggan</th>
                                        <th className="py-2.5 px-3">Tipe</th>
                                        <th className="py-2.5 px-3">Total Tagihan</th>
                                        <th className="py-2.5 px-3">Status Bayar</th>
                                        <th className="py-2.5 px-3">Waktu</th>
                                        <th className="py-2.5 px-3 text-right">Aksi</th>
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
                                                <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-3 px-3 font-mono font-medium text-slate-300">
                                                        #{order.id.slice(0, 8)}
                                                    </td>
                                                    <td className="py-3 px-3 font-medium text-white">
                                                        {order.customerName}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                                                            {order.orderType === 'delivery' ? (
                                                                <>
                                                                    <Motorbike className="w-3 h-3 text-amber-400" /> Antar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Utensils className="w-3 h-3 text-slate-400" /> Meja {order.tableNumber || '-'}
                                                                </>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 font-mono font-medium text-emerald-400">
                                                        Rp {Number(order.totalPrice).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {isPaid ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                <CheckCircle2 className="w-3 h-3" /> Lunas
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                <Clock className="w-3 h-3" /> Menunggu
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
                                                                className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Verifikasi Lunas
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-500">
                                                                Lunas ✓
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
                    <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Direktori Merchant Terdaftar</h2>
                                <p className="text-xs text-slate-400">
                                    Daftar toko dan cabang yang aktif pada sistem eMakan
                                </p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Cari Toko atau ID..."
                                    value={searchStore}
                                    onChange={(e) => setSearchStore(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-[#090d16] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-slate-600"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStores.map((store) => (
                                <div
                                    key={store.id}
                                    className="bg-[#090d16] border border-slate-800 rounded-lg p-4 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="w-7 h-7 rounded bg-slate-800 text-slate-300 font-semibold flex items-center justify-center text-xs border border-slate-700">
                                                {store.name?.slice(0, 2).toUpperCase()}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Active
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-white text-sm mb-1">{store.name}</h3>
                                        <p className="text-slate-400 text-xs mb-3 line-clamp-2">
                                            {store.address || 'Alamat toko belum diatur'}
                                        </p>
                                        <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                                            <p className="truncate">Store ID: {store.id}</p>
                                            <p>WA: {store.whatsappNumber || '-'}</p>
                                            <p>
                                                Gratis Ongkir: {store.freeDistanceKm ?? 5} km (Max {store.maxDeliveryKm ?? 20} km)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                                        <a
                                            href={`/order/${store.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                                        >
                                            Menu Pelanggan <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. TAB USERS & RBAC */}
                {activeTab === 'users' && (
                    <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
                        <div className="pb-4 border-b border-slate-800">
                            <h2 className="text-sm font-semibold text-white">Manajemen Akun & Otoritas (RBAC)</h2>
                            <p className="text-xs text-slate-400">
                                Daftar pengguna terdaftar, otoritas peran sistem, dan keterkaitan toko
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                                        <th className="py-2.5 px-3">Email Pengguna</th>
                                        <th className="py-2.5 px-3">Role Otoritas</th>
                                        <th className="py-2.5 px-3">Store ID Terkait</th>
                                        <th className="py-2.5 px-3">Terdaftar Pada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {usersList.map((u) => {
                                        const isMaster =
                                            u.role === 'master_admin' ||
                                            u.email === 'rafif.muh.anwar@gmail.com';
                                        return (
                                            <tr key={u.id} className="hover:bg-slate-800/30">
                                                <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                                                    {isMaster && (
                                                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                                    )}
                                                    {u.email}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                                            isMaster
                                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                                                        }`}
                                                    >
                                                        {isMaster ? 'MASTER ADMIN' : 'Store Admin'}
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