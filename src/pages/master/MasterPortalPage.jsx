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
    ArrowUpRight,
    LogOut,
    Motorbike,
    Utensils,
    Copy,
    Check,
    Activity,
    Send,
    Key,
    Server,
    CreditCard,
    Layers,
    Users,
    Info,
    Wallet,
    XCircle,
    Crown,
    AlertTriangle,
    Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    extendStoreSubscription,
    resetStoreTrial,
    suspendStore,
    getSubscriptionDetails,
    MONTHLY_SUBSCRIPTION_FEE,
} from '../../services/subscriptionService';
import { deleteStore } from '../../services/storeService';

export default function MasterPortalPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview'); // overview, subscriptions, withdrawals, payhook, orders, stores, users
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
    const [searchSubscription, setSearchSubscription] = useState('');
    const [subscriptionFilter, setSubscriptionFilter] = useState('all'); // all, active, trial, expiring, expired

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
            'Apakah dana transfer pencairan sudah berhasil dikirimkan ke rekening merchant?\n\nKlik OK untuk menandai pencairan ini sebagai SELESAI.'
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

    // SaaS Multi-Tenant Subscriptions
    const storesWithSubscription = useMemo(() => {
        return stores.map((s) => {
            let extra = {};
            if (s.address && typeof s.address === 'string' && s.address.startsWith('{')) {
                try {
                    extra = JSON.parse(s.address);
                } catch {
                    extra = {};
                }
            }

            const trialStartedAt = extra.trialStartedAt || s.created_at || new Date().toISOString();
            const defaultTrialExpiresAt = new Date(new Date(trialStartedAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
            const subscriptionExpiresAt = s.subscription_expires_at || extra.subscriptionExpiresAt || defaultTrialExpiresAt;

            const subDetails = getSubscriptionDetails({
                ...s,
                subscriptionStatus: s.subscription_status || extra.subscriptionStatus,
                subscriptionExpiresAt,
            });

            return {
                ...s,
                extra,
                subscriptionPlan: s.subscription_plan || extra.subscriptionPlan || 'pro',
                subscriptionStatus: subDetails.status,
                subscriptionExpiresAt: subDetails.expiresAt,
                remainingDays: subDetails.remainingDays,
                isExpiringSoon: subDetails.remainingDays <= 7 && subDetails.remainingDays >= 0,
                history: (Array.isArray(s.subscription_history) && s.subscription_history.length > 0)
                    ? s.subscription_history
                    : (Array.isArray(extra.subscriptionHistory) ? extra.subscriptionHistory : []),
            };
        });
    }, [stores]);

    const activeSubscriptionCount = useMemo(() => {
        return storesWithSubscription.filter((s) => s.subscriptionStatus === 'active').length;
    }, [storesWithSubscription]);

    const trialSubscriptionCount = useMemo(() => {
        return storesWithSubscription.filter((s) => s.subscriptionStatus === 'trial').length;
    }, [storesWithSubscription]);

    const expiringSubscriptionCount = useMemo(() => {
        return storesWithSubscription.filter((s) => s.isExpiringSoon && s.subscriptionStatus !== 'expired').length;
    }, [storesWithSubscription]);

    const expiredSubscriptionCount = useMemo(() => {
        return storesWithSubscription.filter((s) => s.subscriptionStatus === 'expired' || s.subscriptionStatus === 'suspended').length;
    }, [storesWithSubscription]);

    const estimatedMRR = activeSubscriptionCount * MONTHLY_SUBSCRIPTION_FEE;

    const filteredStoresSubscription = useMemo(() => {
        return storesWithSubscription.filter((s) => {
            if (subscriptionFilter === 'active' && s.subscriptionStatus !== 'active') return false;
            if (subscriptionFilter === 'trial' && s.subscriptionStatus !== 'trial') return false;
            if (subscriptionFilter === 'expiring' && !s.isExpiringSoon) return false;
            if (subscriptionFilter === 'expired' && s.subscriptionStatus !== 'expired' && s.subscriptionStatus !== 'suspended') return false;

            if (!searchSubscription) return true;
            const query = searchSubscription.toLowerCase();
            return s.name?.toLowerCase().includes(query) || s.id?.toLowerCase().includes(query);
        });
    }, [storesWithSubscription, subscriptionFilter, searchSubscription]);

    const handleMasterExtendSub = async (storeId, months) => {
        const confirmMsg = `Perpanjang langganan toko ini selama ${months} Bulan?\n(Nilai: Rp ${(months * MONTHLY_SUBSCRIPTION_FEE).toLocaleString('id-ID')})`;
        if (!window.confirm(confirmMsg)) return;

        const toastId = toast.loading('Memproses perpanjangan langganan...');
        try {
            await extendStoreSubscription(storeId, months, {
                method: 'superadmin_override',
                amount: months * MONTHLY_SUBSCRIPTION_FEE,
                notes: `Perpanjangan manual ${months} bulan oleh Superadmin`,
            });
            toast.success(`Langganan berhasil diperpanjang +${months} bulan!`, { id: toastId });
            await fetchAllData();
        } catch (err) {
            toast.error(err.message || 'Gagal memperpanjang langganan', { id: toastId });
        }
    };

    const handleMasterResetTrial = async (storeId) => {
        if (!window.confirm('Reset masa uji coba toko ini ke Free Trial 14 Hari?')) return;
        const toastId = toast.loading('Mereset masa trial...');
        try {
            await resetStoreTrial(storeId, 14);
            toast.success('Trial 14 hari berhasil diaktifkan ulang!', { id: toastId });
            await fetchAllData();
        } catch (err) {
            toast.error(err.message || 'Gagal reset trial', { id: toastId });
        }
    };

    const handleMasterSuspendStore = async (storeId, currentStatus) => {
        if (currentStatus === 'suspended') {
            if (!window.confirm('Pulihkan status toko ini menjadi Aktif kembali?')) return;
            const toastId = toast.loading('Mengaktifkan toko...');
            try {
                await extendStoreSubscription(storeId, 1, { notes: 'Re-activated by Superadmin' });
                toast.success('Toko berhasil diaktifkan kembali!', { id: toastId });
                await fetchAllData();
            } catch (err) {
                toast.error(err.message || 'Gagal mengaktifkan toko', { id: toastId });
            }
        } else {
            const reason = window.prompt('Masukkan alasan penonaktifan (Suspend) toko ini:');
            if (reason === null) return;
            const toastId = toast.loading('Menonaktifkan toko...');
            try {
                await suspendStore(storeId, reason || 'Ditangguhkan oleh Superadmin');
                toast.success('Toko berhasil disuspend!', { id: toastId });
                await fetchAllData();
            } catch (err) {
                toast.error(err.message || 'Gagal suspend toko', { id: toastId });
            }
        }
    };

    const handleDeleteStore = async (storeId, storeName) => {
        const displayName = storeName || 'Toko Ini';
        const confirmMsg = `PERINGATAN HAPUS MERCHANT!\n\nApakah Anda yakin ingin MENGHAPUS merchant "${displayName}"?\n\nSemua data terkait di Supabase (menu, kategori, meja, dan pesanan) akan dibersihkan secara permanen.\n\nKetik nama toko atau "HAPUS" untuk konfirmasi:`;
        const userInput = window.prompt(confirmMsg);
        if (userInput === null) return; // Dibatalkan pengguna

        const trimmedInput = userInput.trim().toLowerCase();
        const validMatch =
            trimmedInput === displayName.trim().toLowerCase() ||
            trimmedInput === 'hapus' ||
            trimmedInput === 'delete';

        if (!validMatch) {
            toast.error('Penghapusan dibatalkan: Konfirmasi teks tidak cocok.');
            return;
        }

        const toastId = toast.loading(`Menghapus merchant ${displayName}...`);
        try {
            await deleteStore(storeId);
            toast.success(`Merchant "${displayName}" berhasil dihapus dari database!`, { id: toastId });
            await fetchAllData();
        } catch (err) {
            console.error('Failed to delete store:', err);
            toast.error(err.message || 'Gagal menghapus merchant dari database', { id: toastId });
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Spinner text="Menghubungkan ke Master Platform..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-primary/20 selection:text-primary pb-20">
            {/* Top Navigation Bar - Clean White Theme */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 py-3.5 shadow-2xs">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-secondary tracking-tight">
                                    Portal Master Superadmin
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                                    SUPERADMIN
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Multi-Tenant POS • Akun: <span className="text-slate-700 font-mono font-medium">{user?.email}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Sistem Normal</span>
                        </div>

                        <button
                            type="button"
                            onClick={fetchAllData}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-border shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : 'text-slate-500'}`} />
                            <span className="hidden sm:inline">Refresh Data</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleMasterLogout}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-xs font-semibold text-rose-600 border border-rose-200 shadow-2xs transition-colors cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Kunci Portal</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs - Modern White Segmented Control */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-border shadow-xs overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Ringkasan Platform', icon: Layers },
                        {
                            id: 'subscriptions',
                            label: `Langganan (${activeSubscriptionCount + trialSubscriptionCount})`,
                            icon: Crown,
                            badge: expiringSubscriptionCount > 0 ? `${expiringSubscriptionCount} Berakhir` : null,
                        },
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
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                    isActive
                                        ? 'bg-secondary text-white shadow-xs'
                                        : 'text-slate-600 hover:text-secondary hover:bg-slate-100/70'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span
                                        className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            isActive
                                                ? 'bg-primary text-white'
                                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                                        }`}
                                    >
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
                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Platform GMV (Lunas)</span>
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <DollarSign className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-secondary font-mono tracking-tight">
                                    Rp {totalRevenue.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Akumulasi omset seluruh cabang</span>
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Total Merchant</span>
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Store className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-secondary font-mono tracking-tight">{stores.length}</h3>
                                <p className="text-[11px] text-slate-500 mt-2">
                                    Tenant aktif terdaftar di sistem
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Total Pesanan</span>
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                        <ShoppingBag className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-secondary font-mono tracking-tight">{orders.length}</h3>
                                <p className="text-[11px] text-slate-500 mt-2">
                                    Dine-in dan online delivery
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Pending Pencairan</span>
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Wallet className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-amber-600 font-mono tracking-tight">
                                    Rp {totalPendingPayout.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-[11px] text-amber-700 font-medium mt-2 flex items-center gap-1">
                                    <span>{pendingWithdrawals.length} pengajuan perlu ditransfer</span>
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Antrean QRIS</span>
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-secondary font-mono tracking-tight">
                                    {pendingPayhookOrders.length}
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-2">
                                    Menunggu notifikasi mutasi
                                </p>
                            </div>
                        </div>

                        {/* Recent Activity Quick View */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Live Pending QRIS Box */}
                            <div className="bg-white border border-border rounded-2xl p-6 shadow-xs">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                                    <div>
                                        <h2 className="font-bold text-secondary text-sm">Menunggu Konfirmasi Payhook</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Pesanan belum lunas yang siap dicocokkan mutasi</p>
                                    </div>
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                        {pendingPayhookOrders.length} Pending
                                    </span>
                                </div>

                                {pendingPayhookOrders.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 text-xs">
                                        Tidak ada pesanan QRIS yang sedang pending. Semua transaksi lunas.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {pendingPayhookOrders.slice(0, 5).map((order) => (
                                            <div
                                                key={order.id}
                                                className="bg-slate-50 border border-border p-3.5 rounded-xl flex items-center justify-between gap-3"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-slate-600 font-semibold">
                                                            #{order.id.slice(0, 8)}
                                                        </span>
                                                        <span className="text-xs font-bold text-secondary">
                                                            {order.customerName}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Total: <span className="font-bold text-emerald-600 font-mono">Rp {Number(order.totalPrice).toLocaleString('id-ID')}</span> • {order.orderType === 'delivery' ? 'Antar' : 'Dine-in'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleVerifyPayment(order.id, order.totalPrice)}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
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
                            <div className="bg-white border border-border rounded-2xl p-6 shadow-xs">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                                    <div>
                                        <h2 className="font-bold text-secondary text-sm">Daftar Merchant Terdaftar</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Cabang dan outlet yang aktif dalam sistem</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('stores')}
                                        className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        Semua <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="space-y-2.5">
                                    {stores.slice(0, 5).map((store) => (
                                        <div
                                            key={store.id}
                                            className="bg-slate-50 border border-border p-3 rounded-xl flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                                                    {store.name?.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-secondary">{store.name}</p>
                                                    <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                                        {store.address || 'Alamat belum diatur'}
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={`/order/${store.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-secondary border border-border transition-colors shadow-2xs"
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
                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Menunggu Transfer</span>
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-amber-600 font-mono tracking-tight">
                                    Rp {totalPendingPayout.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-xs text-slate-500 mt-2">
                                    {pendingWithdrawals.length} pengajuan pencairan dari merchant
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Berhasil Ditransfer</span>
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-emerald-600 font-mono tracking-tight">
                                    Rp {totalCompletedPayout.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-xs text-slate-500 mt-2">
                                    {completedWithdrawals.length} penarikan telah diselesaikan
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Total Riwayat Pengajuan</span>
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                                        <Wallet className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-secondary font-mono tracking-tight">
                                    {allWithdrawals.length}
                                </h3>
                                <p className="text-xs text-slate-500 mt-2">
                                    Semua transaksi penarikan toko terdaftar
                                </p>
                            </div>
                        </div>

                        {/* Withdrawals Table Card */}
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                                <div>
                                    <h2 className="text-sm font-bold text-secondary flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-primary" />
                                        <span>Daftar Permintaan Pencairan Dana Merchant</span>
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Periksa nomor rekening tujuan, transfer via mobile banking, lalu tandai transfer selesai
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    {/* Filter Pills */}
                                    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-border text-xs">
                                        {[
                                            { id: 'all', label: `Semua (${allWithdrawals.length})` },
                                            { id: 'pending', label: `Pending (${pendingWithdrawals.length})` },
                                            { id: 'completed', label: `Selesai (${completedWithdrawals.length})` },
                                            { id: 'rejected', label: `Ditolak (${rejectedWithdrawals.length})` },
                                        ].map((f) => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setWithdrawalFilter(f.id)}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                                    withdrawalFilter === f.id
                                                        ? 'bg-white text-secondary shadow-xs'
                                                        : 'text-slate-600 hover:text-secondary'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative w-full sm:w-60">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Cari toko, rekening, ID..."
                                            value={searchWithdrawal}
                                            onChange={(e) => setSearchWithdrawal(e.target.value)}
                                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-border text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                                            <th className="py-3 px-3">ID & Waktu</th>
                                            <th className="py-3 px-3">Merchant Toko</th>
                                            <th className="py-3 px-3">Rekening Pencairan</th>
                                            <th className="py-3 px-3">Nominal Pencairan</th>
                                            <th className="py-3 px-3">Status</th>
                                            <th className="py-3 px-3 text-right">Tindakan Superadmin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60 font-medium">
                                        {filteredWithdrawals.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-10 text-slate-400">
                                                    Tidak ada pengajuan pencairan dana yang cocok
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredWithdrawals.map((w) => {
                                                const isPending = w.status === 'pending';
                                                const isCompleted = w.status === 'completed';
                                                const isRejected = w.status === 'rejected';

                                                return (
                                                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-3.5 px-3">
                                                            <div className="font-mono font-bold text-secondary">
                                                                {w.id}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 mt-0.5">
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

                                                        <td className="py-3.5 px-3">
                                                            <div className="font-bold text-secondary">{w.storeName}</div>
                                                            <div className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                                                                {w.storeId}
                                                            </div>
                                                        </td>

                                                        <td className="py-3.5 px-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-secondary">{w.bankName}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopy(w.accountNumber, w.id)}
                                                                    title="Salin Nomor Rekening"
                                                                    className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-md cursor-pointer transition-colors"
                                                                >
                                                                    {copiedField === w.id ? (
                                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                                    ) : (
                                                                        <Copy className="w-3.5 h-3.5" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                            <div className="font-mono text-slate-700 tracking-wider font-semibold">
                                                                {w.accountNumber}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500">
                                                                a.n. <span className="text-secondary font-medium">{w.accountHolder}</span>
                                                            </div>
                                                        </td>

                                                        <td className="py-3.5 px-3">
                                                            <div className="font-mono text-sm font-extrabold text-secondary">
                                                                Rp {Number(w.amount || 0).toLocaleString('id-ID')}
                                                            </div>
                                                            {w.notes && (
                                                                <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={w.notes}>
                                                                    {w.notes}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="py-3.5 px-3">
                                                            {isPending && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                    <Clock className="w-3 h-3" /> Menunggu Transfer
                                                                </span>
                                                            )}
                                                            {isCompleted && (
                                                                <div>
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        <CheckCircle2 className="w-3 h-3" /> Selesai Ditransfer
                                                                    </span>
                                                                    {w.completedAt && (
                                                                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
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
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                        <XCircle className="w-3 h-3" /> Ditolak
                                                                    </span>
                                                                    {w.rejectReason && (
                                                                        <div className="text-[10px] text-rose-600 mt-0.5 truncate max-w-[130px]" title={w.rejectReason}>
                                                                            {w.rejectReason}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="py-3.5 px-3 text-right">
                                                            {isPending ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCompleteWithdrawal(w.storeId, w.id)}
                                                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        <span>Tandai Selesai</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRejectWithdrawal(w.storeId, w.id)}
                                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                                                    >
                                                                        <span>Tolak</span>
                                                                    </button>
                                                                </div>
                                                            ) : isCompleted ? (
                                                                <span className="text-[11px] text-slate-400">
                                                                    Lunas terbayar
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400">
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
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-xs">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Serverless Webhook Endpoint Aktif</span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-bold text-secondary tracking-tight">
                                        Pusat Webhook Payhook & QRIS Dinamis Serverless
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                                        Setiap mutasi masuk dari m-Banking atau e-wallet (BCA, Mandiri, BRI, BNI, GoPay, DANA) yang ditangkap oleh Payhook Android diproses secara instan untuk verifikasi pesanan.
                                    </p>
                                </div>

                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handlePingConnection}
                                        disabled={isPinging}
                                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-border shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <Activity className={`w-3.5 h-3.5 text-primary ${isPinging ? 'animate-spin' : ''}`} />
                                        <span>{isPinging ? 'Menguji...' : 'Uji Ping Koneksi'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSimulatePayment(50123)}
                                        disabled={isSimulating}
                                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
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
                            <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Server className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold text-secondary">
                                            1. URL Webhook
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                        POST
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-border">
                                    <input
                                        type="text"
                                        readOnly
                                        value={webhookFullUrl}
                                        className="flex-1 bg-transparent text-xs text-slate-700 font-mono outline-none px-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(webhookFullUrl, 'webhook_url')}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0 border border-border shadow-2xs"
                                    >
                                        {copiedField === 'webhook_url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedField === 'webhook_url' ? 'Tersalin' : 'Salin'}</span>
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Masukkan URL ini pada kolom Webhook URL di aplikasi Payhook Android Anda.
                                </p>
                            </div>

                            {/* Card 2: Secret Key Header */}
                            <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Key className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold text-secondary">
                                            2. Header Secret Key
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                        X-API-KEY
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-border">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`x-api-key: ${payhookConfig.secretKey}`}
                                        className="flex-1 bg-transparent text-xs text-slate-700 font-mono outline-none px-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(payhookConfig.secretKey, 'secret_key')}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0 border border-border shadow-2xs"
                                    >
                                        {copiedField === 'secret_key' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedField === 'secret_key' ? 'Tersalin' : 'Salin'}</span>
                                    </button>
                                </div>

                                <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-xl border border-border">
                                    Header: <span className="font-bold text-secondary">x-api-key</span> | Value:{' '}
                                    <span className="font-bold text-emerald-700">{payhookConfig.secretKey}</span>
                                </div>
                            </div>
                        </div>

                        {/* 3 Langkah Praktis Setting Aplikasi Payhook di Android */}
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-secondary">
                                    Panduan Konfigurasi Aplikasi Payhook Android
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Tiga langkah mudah untuk mengaktifkan sinkronisasi otomatis mutasi bank
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 border border-border rounded-xl">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center mb-2.5">
                                        1
                                    </div>
                                    <h4 className="font-bold text-secondary text-xs mb-1">Pilih Aplikasi Bank</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Buka Payhook di Android, centang aplikasi yang aktif menerima transfer: BCA, Mandiri, GoBiz, atau DANA Bisnis.
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 border border-border rounded-xl">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center mb-2.5">
                                        2
                                    </div>
                                    <h4 className="font-bold text-secondary text-xs mb-1">Tempel Webhook URL</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Masukkan URL webhook sistem: <span className="text-secondary font-mono font-medium break-all">{webhookFullUrl}</span> pada kolom URL di aplikasi.
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 border border-border rounded-xl">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center mb-2.5">
                                        3
                                    </div>
                                    <h4 className="font-bold text-secondary text-xs mb-1">Isi Header Secret</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Di pengaturan Header tambahkan Name: <span className="text-secondary font-mono font-medium">x-api-key</span> dan Value:{' '}
                                        <span className="text-emerald-700 font-mono font-bold">{payhookConfig.secretKey}</span>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Barcode QRIS Master Platform (Dukungan QRIS Dinamis Otomatis) */}
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-xs">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-border gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-secondary">
                                            Generator QRIS Dinamis (EMVCo Tag 54 + CRC16)
                                        </h3>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Nominal Terkunci
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Nominal tagihan di-inject otomatis ke format QRIS standar nasional sehingga pelanggan tidak perlu input manual saat bayar.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-border">
                                    <span className="text-xs font-medium text-slate-500">Tes Nominal:</span>
                                    <div className="flex items-center gap-1 font-mono text-xs">
                                        <span className="text-slate-400">Rp</span>
                                        <input
                                            type="number"
                                            value={liveAmount}
                                            onChange={(e) => setLiveAmount(Number(e.target.value) || 0)}
                                            className="w-24 bg-transparent text-secondary font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
                                {/* QR Code Display (1 Col) */}
                                <div className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-2xl border border-border">
                                    <div className="p-3 bg-white rounded-xl shadow-xs border border-border">
                                        <QRCodeSVG
                                            value={generateDynamicQris(payhookConfig.rawStaticQris || MASTER_QRIS_STATIC, liveAmount)}
                                            size={180}
                                            level="M"
                                            includeMargin={true}
                                            className="mx-auto"
                                        />
                                    </div>
                                    <div className="mt-3.5 text-center">
                                        <p className="text-base font-extrabold text-secondary font-mono">
                                            Rp {Number(liveAmount).toLocaleString('id-ID')}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Pindai via BCA / GoPay / DANA untuk verifikasi
                                        </p>
                                    </div>
                                </div>

                                {/* Metadata Breakdown (2 Cols) */}
                                <div className="lg:col-span-2 space-y-3.5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-border">
                                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Merchant Terdaftar</span>
                                            <span className="font-bold text-secondary text-xs mt-0.5 block">
                                                {payhookConfig.merchantName}
                                            </span>
                                            <span className="text-xs text-slate-500 mt-0.5 block truncate">
                                                {payhookConfig.address}
                                            </span>
                                        </div>

                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-border">
                                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">NMID Nasional (ASPI)</span>
                                            <span className="font-mono text-xs font-bold text-secondary mt-0.5 block">
                                                {payhookConfig.nmid}
                                            </span>
                                            <span className="text-xs text-slate-500 mt-0.5 block">
                                                Provider: {payhookConfig.provider || 'DANA Bisnis / ASPI'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl border border-border space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                                            <Info className="w-4 h-4 text-primary" />
                                            <span>Mekanisme Tag 54 + Checksum CRC16</span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Saat pesanan dibuat, sistem mengambil QRIS statis dan menyisipkan Tag 54 (Transaction Amount) beserta perhitungan ulang checksum CRC16-CCITT standar EMVCo. Aplikasi mobile banking membaca tag ini sebagai QR Dinamis dan langsung mengunci jumlah pembayaran.
                                        </p>
                                    </div>

                                    {/* Raw EMVCo Payload Preview */}
                                    <div className="p-3 bg-slate-50 rounded-xl border border-border font-mono text-[11px] text-slate-500">
                                        <span className="text-slate-400 block mb-1 font-semibold">Payload EMVCo Terkini:</span>
                                        <p className="break-all text-slate-700">
                                            {generateDynamicQris(payhookConfig.rawStaticQris || MASTER_QRIS_STATIC, liveAmount)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Editor Config Credentials */}
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-secondary">Kredensial & Konfigurasi Payhook</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Parameter merchant master untuk platform eMakan</p>
                            </div>
                            <form onSubmit={handleSavePayhookConfig} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <label className="block text-slate-600 mb-1 font-semibold">Nama Merchant</label>
                                    <input
                                        type="text"
                                        value={payhookConfig.merchantName}
                                        onChange={(e) => setPayhookConfig({ ...payhookConfig, merchantName: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-border rounded-xl text-slate-800 outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-600 mb-1 font-semibold">NMID</label>
                                    <input
                                        type="text"
                                        value={payhookConfig.nmid}
                                        onChange={(e) => setPayhookConfig({ ...payhookConfig, nmid: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-border rounded-xl text-slate-800 font-mono outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-600 mb-1 font-semibold">Secret Key (x-api-key)</label>
                                    <input
                                        type="text"
                                        value={payhookConfig.secretKey}
                                        onChange={(e) => setPayhookConfig({ ...payhookConfig, secretKey: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-border rounded-xl text-slate-800 font-mono outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingConfig}
                                        className="w-full py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>{isSavingConfig ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 4. TAB TRANSAKSI GLOBAL (ALL ORDERS) */}
                {activeTab === 'orders' && (
                    <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                            <div>
                                <h2 className="text-sm font-bold text-secondary">Stream Transaksi Seluruh Merchant</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Daftar pesanan realtime dari semua cabang resto
                                </p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Cari ID, Pelanggan, Meja..."
                                    value={searchOrder}
                                    onChange={(e) => setSearchOrder(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-border text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                                        <th className="py-3 px-3">Order ID</th>
                                        <th className="py-3 px-3">Pelanggan</th>
                                        <th className="py-3 px-3">Tipe</th>
                                        <th className="py-3 px-3">Total Tagihan</th>
                                        <th className="py-3 px-3">Status Bayar</th>
                                        <th className="py-3 px-3">Waktu</th>
                                        <th className="py-3 px-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 font-medium">
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-slate-400">
                                                Tidak ada pesanan ditemukan
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((order) => {
                                            const isPaid = order.paymentStatus === 'paid';
                                            return (
                                                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3.5 px-3 font-mono font-bold text-secondary">
                                                        #{order.id.slice(0, 8)}
                                                    </td>
                                                    <td className="py-3.5 px-3 font-bold text-secondary">
                                                        {order.customerName}
                                                    </td>
                                                    <td className="py-3.5 px-3">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                                            {order.orderType === 'delivery' ? (
                                                                <>
                                                                    <Motorbike className="w-3 h-3 text-primary" /> Antar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Utensils className="w-3 h-3 text-slate-500" /> Meja {order.tableNumber || '-'}
                                                                </>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-600">
                                                        Rp {Number(order.totalPrice).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="py-3.5 px-3">
                                                        {isPaid ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 className="w-3 h-3" /> Lunas
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                <Clock className="w-3 h-3" /> Menunggu
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-slate-400 text-[11px] font-mono">
                                                        {order.createdAt
                                                            ? new Date(order.createdAt).toLocaleTimeString('id-ID', {
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                              })
                                                            : '-'}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-right">
                                                        {!isPaid ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleVerifyPayment(order.id, order.totalPrice)}
                                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Verifikasi Lunas
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] text-emerald-700 font-semibold">
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

                {/* 5. TAB TOKO & MERCHANT (STORES) */}
                {activeTab === 'stores' && (
                    <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                            <div>
                                <h2 className="text-sm font-bold text-secondary">Direktori Merchant Terdaftar</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Daftar toko dan cabang yang aktif pada sistem eMakan
                                </p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Cari Toko atau ID..."
                                    value={searchStore}
                                    onChange={(e) => setSearchStore(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStores.map((store) => (
                                <div
                                    key={store.id}
                                    className="bg-slate-50/70 border border-border hover:border-slate-300 rounded-2xl p-5 flex flex-col justify-between transition-colors shadow-2xs"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20">
                                                {store.name?.slice(0, 2).toUpperCase()}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Active
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-secondary text-sm mb-1">{store.name}</h3>
                                        <p className="text-slate-500 text-xs mb-3 line-clamp-2">
                                            {store.address || 'Alamat toko belum diatur'}
                                        </p>
                                        <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                                            <p className="truncate">Store ID: {store.id}</p>
                                            <p>WA: {store.whatsappNumber || '-'}</p>
                                            <p>
                                                Gratis Ongkir: {store.freeDistanceKm ?? 5} km (Max {store.maxDeliveryKm ?? 20} km)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-3 mt-3 border-t border-border flex items-center justify-between gap-2">
                                        <a
                                            href={`/order/${store.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                                        >
                                            Menu Pelanggan <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteStore(store.id, store.name)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/60 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                                            title="Hapus merchant permanen dari Supabase"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Hapus</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 6. TAB USERS & RBAC */}
                {activeTab === 'users' && (
                    <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="pb-4 border-b border-border">
                            <h2 className="text-sm font-bold text-secondary">Manajemen Akun & Otoritas (RBAC)</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Daftar pengguna terdaftar, otoritas peran sistem, dan keterkaitan toko
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-border text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                                        <th className="py-3 px-3">Email Pengguna</th>
                                        <th className="py-3 px-3">Role Otoritas</th>
                                        <th className="py-3 px-3">Store ID Terkait</th>
                                        <th className="py-3 px-3">Terdaftar Pada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 font-medium">
                                    {usersList.map((u) => {
                                        const isMaster =
                                            u.role === 'master_admin' ||
                                            u.email === 'rafif.muh.anwar@gmail.com';
                                        return (
                                            <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3.5 px-3 font-bold text-secondary flex items-center gap-2">
                                                    {isMaster && (
                                                        <Shield className="w-3.5 h-3.5 text-primary" />
                                                    )}
                                                    {u.email}
                                                </td>
                                                <td className="py-3.5 px-3">
                                                    <span
                                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                            isMaster
                                                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                        }`}
                                                    >
                                                        {isMaster ? 'MASTER ADMIN' : 'Store Admin'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 font-mono text-slate-500 text-[11px]">
                                                    {u.store_id || '-'}
                                                </td>
                                                <td className="py-3.5 px-3 text-slate-500 text-[11px]">
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

                {/* 7. TAB LANGGANAN RESTO */}
                {activeTab === 'subscriptions' && (
                    <div className="space-y-6">
                        {/* 4 Metric Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Estimasi MRR (Bulanan)</span>
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Crown className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-secondary font-mono tracking-tight">
                                    Rp {estimatedMRR.toLocaleString('id-ID')}
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>{activeSubscriptionCount} Resto Aktif @ Rp 150.000 / bln</span>
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Resto Aktif Berlangganan</span>
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-secondary font-mono tracking-tight">
                                    {activeSubscriptionCount}{' '}
                                    <span className="text-sm font-semibold text-slate-500">Resto</span>
                                </h3>
                                <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                                    Layanan kasir & QR berjalan normal
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Masa Trial (14 Hari)</span>
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-secondary font-mono tracking-tight">
                                    {trialSubscriptionCount}{' '}
                                    <span className="text-sm font-semibold text-slate-500">Resto</span>
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-2">
                                    Dalam periode uji coba gratis
                                </p>
                            </div>

                            <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider">Segera Habis / Expired</span>
                                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-rose-600 font-mono tracking-tight">
                                    {expiringSubscriptionCount + expiredSubscriptionCount}{' '}
                                    <span className="text-sm font-semibold text-slate-500">Resto</span>
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-2">
                                    {expiringSubscriptionCount} segera habis • {expiredSubscriptionCount} expired
                                </p>
                            </div>
                        </div>

                        {/* Store Table & Filter Bar */}
                        <div className="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                                <div>
                                    <h2 className="text-sm font-bold text-secondary flex items-center gap-2">
                                        <Crown className="w-4 h-4 text-primary" />
                                        <span>Manajemen Billing & Langganan Resto</span>
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Pantau status langganan, tanggal kedaluwarsa, dan lakukan intervensi manual perpanjangan
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={searchSubscription}
                                            onChange={(e) => setSearchSubscription(e.target.value)}
                                            placeholder="Cari nama resto atau ID..."
                                            className="w-full sm:w-56 pl-8 pr-3 py-1.5 bg-white border border-border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary"
                                        />
                                    </div>

                                    <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-border overflow-x-auto">
                                        {[
                                            { id: 'all', label: `Semua (${storesWithSubscription.length})` },
                                            { id: 'active', label: `Aktif (${activeSubscriptionCount})` },
                                            { id: 'trial', label: `Trial (${trialSubscriptionCount})` },
                                            { id: 'expiring', label: `Segera Habis (${expiringSubscriptionCount})` },
                                            { id: 'expired', label: `Expired (${expiredSubscriptionCount})` },
                                        ].map((f) => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setSubscriptionFilter(f.id)}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                                    subscriptionFilter === f.id
                                                        ? 'bg-white text-secondary shadow-xs'
                                                        : 'text-slate-600 hover:text-secondary'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-border text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                                            <th className="py-3 px-3">Nama Restoran</th>
                                            <th className="py-3 px-3">Status</th>
                                            <th className="py-3 px-3">Masa Berlaku</th>
                                            <th className="py-3 px-3">Sisa Hari</th>
                                            <th className="py-3 px-3">Paket</th>
                                            <th className="py-3 px-3 text-right">Aksi Cepat Superadmin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60 font-medium">
                                        {filteredStoresSubscription.map((store) => {
                                            const isExpired = store.subscriptionStatus === 'expired';
                                            const isSuspended = store.subscriptionStatus === 'suspended';
                                            const isPastDue = store.subscriptionStatus === 'past_due';
                                            const isTrial = store.subscriptionStatus === 'trial';
                                            const isActive = store.subscriptionStatus === 'active';

                                            return (
                                                <tr key={store.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3.5 px-3">
                                                        <div className="font-bold text-secondary">{store.name || 'Resto'}</div>
                                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                                            ID: {store.id}
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-3">
                                                        {isActive && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 className="w-3 h-3" /> Aktif
                                                            </span>
                                                        )}
                                                        {isTrial && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                Free Trial
                                                            </span>
                                                        )}
                                                        {isPastDue && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                                                Masa Tenggang
                                                            </span>
                                                        )}
                                                        {isExpired && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                Expired
                                                            </span>
                                                        )}
                                                        {isSuspended && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                Suspended
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                                                        {store.subscriptionExpiresAt
                                                            ? new Date(store.subscriptionExpiresAt).toLocaleDateString('id-ID', {
                                                                  day: 'numeric',
                                                                  month: 'short',
                                                                  year: 'numeric',
                                                              })
                                                            : '-'}
                                                    </td>

                                                    <td className="py-3.5 px-3">
                                                        <span
                                                            className={`text-xs font-bold font-mono ${
                                                                store.remainingDays <= 0
                                                                    ? 'text-rose-600'
                                                                    : store.remainingDays <= 7
                                                                    ? 'text-amber-600'
                                                                    : 'text-emerald-600'
                                                            }`}
                                                        >
                                                            {store.remainingDays > 0 ? `${store.remainingDays} Hari` : 'Habis'}
                                                        </span>
                                                    </td>

                                                    <td className="py-3.5 px-3">
                                                        <span className="text-[11px] text-slate-600 font-medium">
                                                            eMakan Pro (Rp 150k/bln)
                                                        </span>
                                                    </td>

                                                    <td className="py-3.5 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMasterExtendSub(store.id, 1)}
                                                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold transition-colors cursor-pointer"
                                                                title="Perpanjang 1 Bulan (Rp 150.000)"
                                                            >
                                                                +30 Hari
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMasterExtendSub(store.id, 3)}
                                                                className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] font-bold transition-colors cursor-pointer"
                                                                title="Perpanjang 3 Bulan (Rp 420.000)"
                                                            >
                                                                +90 Hari
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMasterExtendSub(store.id, 12)}
                                                                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold transition-colors cursor-pointer"
                                                                title="Perpanjang 1 Tahun (Rp 1.500.000)"
                                                            >
                                                                +1 Thn
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMasterResetTrial(store.id)}
                                                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition-colors cursor-pointer"
                                                                title="Reset Masa Trial 14 Hari"
                                                            >
                                                                Reset Trial
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMasterSuspendStore(store.id, store.subscriptionStatus)}
                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                                                    isSuspended
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                                                }`}
                                                            >
                                                                {isSuspended ? 'Aktifkan' : 'Suspend'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteStore(store.id, store.name)}
                                                                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                                                title="Hapus merchant permanen dari database"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
