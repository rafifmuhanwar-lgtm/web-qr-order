import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getStore } from '../../services/storeService';
import { getOrdersByStore } from '../../services/orderService';
import { getStoreWallet } from '../../services/walletService';
import {
    SUBSCRIPTION_PLANS,
    getSubscriptionDetails,
    paySubscriptionWithWallet,
} from '../../services/subscriptionService';
import { generateDynamicQris, MASTER_QRIS_STATIC } from '../../utils/qrisUtils';
import { QRCodeSVG } from 'qrcode.react';
import {
    Crown,
    CheckCircle2,
    Calendar,
    AlertTriangle,
    Wallet,
    QrCode,
    Check,
    Copy,
    ChevronRight,
    Clock,
    RefreshCw,
    X,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function SubscriptionPage() {
    const { storeId } = useAuth();
    const [store, setStore] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal checkout state
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'qris'
    const [isProcessing, setIsProcessing] = useState(false);
    const [uniqueCode, setUniqueCode] = useState(0);
    const [copiedAmount, setCopiedAmount] = useState(false);

    const loadData = useCallback(async (isManual = false) => {
        if (!storeId) return;
        try {
            if (isManual) setRefreshing(true);
            else setLoading(true);

            const [storeData, ordersData] = await Promise.all([
                getStore(storeId),
                getOrdersByStore(storeId),
            ]);
            setStore(storeData);
            setOrders(ordersData || []);

            const walletData = await getStoreWallet(storeId, ordersData || []);
            setWallet(walletData);

            if (isManual) toast.success('Status langganan diperbarui');
        } catch (err) {
            console.error('Error loading subscription data:', err);
            toast.error('Gagal memuat data langganan');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [storeId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const subscription = useMemo(() => {
        return getSubscriptionDetails(store);
    }, [store]);

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        const code = Math.floor(100 + Math.random() * 899);
        setUniqueCode(code);
        if ((wallet?.availableBalance || 0) >= plan.price) {
            setPaymentMethod('wallet');
        } else {
            setPaymentMethod('qris');
        }
    };

    const handlePayWithWallet = async () => {
        if (!selectedPlan) return;
        setIsProcessing(true);
        const toastId = toast.loading('Memproses pembayaran dari saldo toko...');
        try {
            await paySubscriptionWithWallet(storeId, selectedPlan.id, orders);
            toast.success(`Paket ${selectedPlan.name} berhasil diaktifkan!`, { id: toastId });
            setSelectedPlan(null);
            await loadData();
        } catch (err) {
            toast.error(err.message || 'Gagal memproses pembayaran langganan', { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    const dynamicQrisString = useMemo(() => {
        if (!selectedPlan) return MASTER_QRIS_STATIC;
        const totalWithCode = selectedPlan.price + uniqueCode;
        return generateDynamicQris(MASTER_QRIS_STATIC, totalWithCode);
    }, [selectedPlan, uniqueCode]);

    const handleCopyAmount = (amount) => {
        navigator.clipboard.writeText(amount.toString());
        setCopiedAmount(true);
        toast.success('Nominal disalin');
        setTimeout(() => setCopiedAmount(false), 2000);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    if (loading) return <Spinner text="Memuat status langganan..." />;

    const availableBalance = wallet?.availableBalance || 0;
    const isExpired = subscription.status === 'expired';
    const isPastDue = subscription.status === 'past_due';
    const isTrial = subscription.status === 'trial';
    const isActive = subscription.status === 'active';

    return (
        <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
            {/* 1. Header Section (Clean White Fintech Design) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-secondary flex items-center gap-2">
                        <Crown className="w-6 h-6 text-primary" />
                        <span>Paket & Langganan SaaS</span>
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                        Kelola lisensi operasional restoran dan perpanjang langganan cloud kasir POS
                    </p>
                </div>
                <button
                    onClick={() => loadData(true)}
                    disabled={refreshing}
                    className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-border hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : 'text-slate-400'}`} />
                    <span>Perbarui Status</span>
                </button>
            </div>

            {/* 2. Top 3 Status KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Akun & Lisensi */}
                <div className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Status Lisensi
                        </span>
                        <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                isActive
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : isTrial
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-rose-50 text-rose-600'
                            }`}
                        >
                            {isActive ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : isTrial ? (
                                <Clock className="w-4 h-4" />
                            ) : (
                                <AlertTriangle className="w-4 h-4" />
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            {isActive && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Aktif Berlangganan
                                </span>
                            )}
                            {isTrial && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Free Trial (14 Hari)
                                </span>
                            )}
                            {isPastDue && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                    Masa Tenggang (Grace Period)
                                </span>
                            )}
                            {isExpired && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Kedaluwarsa
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {isExpired
                                ? 'Pemesanan QR dinonaktifkan sementara'
                                : 'Paket eMakan Pro • Rp 150.000 / bulan'}
                        </p>
                    </div>
                </div>

                {/* Sisa Masa Aktif */}
                <div className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Masa Aktif
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-secondary font-mono tracking-tight">
                            {subscription.remainingDays}{' '}
                            <span className="text-sm font-semibold text-slate-500 font-sans">Hari Tersisa</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5">
                            {isExpired
                                ? `Kedaluwarsa sejak ${formatDate(subscription.expiresAt)}`
                                : `Berlaku hingga ${formatDate(subscription.expiresAt)}`}
                        </p>
                    </div>
                </div>

                {/* Saldo Escrow Resto */}
                <div className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Saldo Siap Pakai
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-secondary font-mono tracking-tight">
                            {formatPrice(availableBalance)}
                        </p>
                        <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Bisa langsung dipakai bayar langganan</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Pilihan Paket Perpanjangan (Clean 3-Tier Grid) */}
            <div className="space-y-4 pt-2">
                <div>
                    <h2 className="text-base sm:text-lg font-bold text-secondary">Pilihan Paket Perpanjangan</h2>
                    <p className="text-xs text-slate-500">
                        Tarif resmi Rp 150.000 / bulan. Pilih paket kuartal atau tahunan untuk hemat biaya operasional.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {SUBSCRIPTION_PLANS.map((plan) => {
                        const isPopuler = plan.popular;
                        return (
                            <div
                                key={plan.id}
                                className={`rounded-2xl p-6 bg-white transition-all duration-200 flex flex-col justify-between ${
                                    isPopuler
                                        ? 'border-2 border-primary shadow-md ring-2 ring-primary/10'
                                        : 'border border-border hover:border-slate-300 shadow-xs'
                                }`}
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-bold text-secondary text-base">{plan.name}</h3>
                                        <span
                                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                                isPopuler
                                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                                    : plan.savings > 0
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}
                                        >
                                            {plan.badge}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl sm:text-3xl font-extrabold text-secondary font-mono tracking-tight">
                                                {formatPrice(plan.price)}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">
                                                / {plan.periodLabel}
                                            </span>
                                        </div>

                                        {plan.savings > 0 ? (
                                            <p className="text-xs text-emerald-600 font-semibold mt-1">
                                                Setara {formatPrice(plan.perMonth)}/bln (Hemat {formatPrice(plan.savings)})
                                            </p>
                                        ) : (
                                            <p className="text-xs text-slate-400 mt-1">
                                                Tarif standar Rp 150.000 / bulan
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        {plan.features.map((feat, i) => (
                                            <div key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        onClick={() => handleSelectPlan(plan)}
                                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                                            isPopuler
                                                ? 'bg-primary hover:bg-primary-dark text-white'
                                                : 'bg-secondary hover:bg-secondary/90 text-white'
                                        }`}
                                    >
                                        <span>Pilih {plan.name}</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. Riwayat Tagihan & Langganan (Clean White Table) */}
            <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div>
                    <h2 className="text-base font-bold text-secondary">Riwayat Tagihan & Langganan</h2>
                    <p className="text-xs text-slate-400">
                        Catatan transaksi dan pembayaran lisensi cloud restoran Anda
                    </p>
                </div>

                {store?.subscriptionHistory && store.subscriptionHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-border/80 text-slate-500 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="py-3 px-4">Tanggal Pembayaran</th>
                                    <th className="py-3 px-4">Paket</th>
                                    <th className="py-3 px-4">Nominal</th>
                                    <th className="py-3 px-4">Metode Bayar</th>
                                    <th className="py-3 px-4">Masa Berlaku Sampai</th>
                                    <th className="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 font-medium">
                                {store.subscriptionHistory.map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3.5 px-4 text-slate-700">
                                            {item.paidAt
                                                ? new Date(item.paidAt).toLocaleDateString('id-ID', {
                                                      day: 'numeric',
                                                      month: 'short',
                                                      year: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  })
                                                : '-'}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold text-secondary">{item.planName || '-'}</td>
                                        <td className="py-3.5 px-4 text-slate-900 font-semibold font-mono">
                                            {formatPrice(item.amount)}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {item.paymentMethod === 'wallet_deduction' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                                    <Wallet className="w-3 h-3" /> Potong Saldo Resto
                                                </span>
                                            ) : item.paymentMethod === 'superadmin_override' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                                    Aktivasi Master Superadmin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                    <QrCode className="w-3 h-3" /> QRIS Otomatis
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                                            {formatDate(item.expiresAt)}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3" /> Lunas
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                        <Clock className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-600">Belum ada riwayat perpanjangan</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Semua tagihan langganan yang sudah dibayar akan tercatat otomatis di sini.
                        </p>
                    </div>
                )}
            </div>

            {/* 5. Clean Modal Checkout Pembayaran */}
            {selectedPlan && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-border overflow-hidden my-auto animate-enter">
                        {/* Header Modal */}
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-white">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                    Konfirmasi Perpanjangan
                                </span>
                                <h3 className="text-base font-bold text-secondary mt-0.5">
                                    {selectedPlan.name} • {selectedPlan.periodLabel}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedPlan(null)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[calc(88vh-130px)] overflow-y-auto">
                            {/* Rincian Tagihan */}
                            <div className="bg-slate-50 border border-border rounded-xl p-3.5 space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                    <span>Durasi Lisensi:</span>
                                    <span className="font-semibold text-secondary">{selectedPlan.periodLabel}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                    <span>Biaya Paket:</span>
                                    <span className="font-semibold text-secondary font-mono">
                                        {formatPrice(selectedPlan.price)}
                                    </span>
                                </div>
                                {paymentMethod === 'qris' && (
                                    <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span>Kode Unik Verifikasi:</span>
                                        <span className="font-mono font-bold text-primary">+{uniqueCode}</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-border flex items-center justify-between">
                                    <span className="text-xs font-bold text-secondary">Total Transfer:</span>
                                    <span className="text-base font-extrabold text-primary font-mono">
                                        {formatPrice(
                                            paymentMethod === 'qris'
                                                ? selectedPlan.price + uniqueCode
                                                : selectedPlan.price
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Pilih Metode Pembayaran */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                                    Pilih Metode Bayar
                                </label>

                                <div className="grid grid-cols-2 gap-2.5">
                                    {/* Opsi 1: Potong Saldo Resto */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('wallet')}
                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                            paymentMethod === 'wallet'
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-border hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-secondary">
                                            <Wallet
                                                className={`w-3.5 h-3.5 ${
                                                    paymentMethod === 'wallet' ? 'text-primary' : 'text-slate-400'
                                                }`}
                                            />
                                            <span>Saldo Resto</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            Sedia: {formatPrice(availableBalance)}
                                        </div>
                                    </button>

                                    {/* Opsi 2: QRIS Otomatis */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('qris')}
                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                            paymentMethod === 'qris'
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-border hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-secondary">
                                            <QrCode
                                                className={`w-3.5 h-3.5 ${
                                                    paymentMethod === 'qris' ? 'text-primary' : 'text-slate-400'
                                                }`}
                                            />
                                            <span>Transfer QRIS</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            BCA, DANA, GoPay, dll
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Konten Tab Pembayaran */}
                            {paymentMethod === 'wallet' ? (
                                <div className="space-y-3 pt-1">
                                    {availableBalance >= selectedPlan.price ? (
                                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-0.5">
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                <span>Saldo Toko Mencukupi</span>
                                            </div>
                                            <p className="text-[11px] text-emerald-700 leading-relaxed">
                                                Dana Rp {selectedPlan.price.toLocaleString('id-ID')} akan dipotong dari saldo
                                                siap tarik. Lisensi langsung aktif seketika.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-0.5">
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                                <span>Saldo Belum Mencukupi</span>
                                            </div>
                                            <p className="text-[11px] text-rose-700 leading-relaxed">
                                                Saldo tersedia {formatPrice(availableBalance)} belum cukup untuk paket{' '}
                                                {formatPrice(selectedPlan.price)}. Silakan pilih metode Transfer QRIS di atas.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handlePayWithWallet}
                                        disabled={isProcessing || availableBalance < selectedPlan.price}
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                <span>Memproses Pembayaran...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                <span>Konfirmasi Potong Saldo ({formatPrice(selectedPlan.price)})</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 pt-1">
                                    <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 border border-border rounded-xl">
                                        <div className="p-2 bg-white rounded-xl shadow-xs border border-border mb-2.5">
                                            <QRCodeSVG
                                                value={dynamicQrisString}
                                                size={140}
                                                level="M"
                                                includeMargin={true}
                                            />
                                        </div>

                                        <p className="text-[11px] text-slate-500 font-medium">Nominal Transfer Persis:</p>
                                        <div className="flex items-center justify-center gap-2 mt-0.5">
                                            <span className="text-base font-black text-secondary font-mono tracking-tight">
                                                {formatPrice(selectedPlan.price + uniqueCode)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyAmount(selectedPlan.price + uniqueCode)}
                                                className="p-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                                                title="Salin Nominal"
                                            >
                                                {copiedAmount ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-amber-700 font-semibold mt-1">
                                            *Wajib transfer tepat 3 digit unik (+{uniqueCode}) untuk aktivasi otomatis.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="px-5 py-3 bg-slate-50 border-t border-border flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedPlan(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
