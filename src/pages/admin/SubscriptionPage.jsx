import { useState, useEffect, useMemo } from 'react';
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
    Sparkles,
    Check,
    Copy,
    ChevronRight,
    ArrowRight,
    Clock,
    ShieldCheck,
    CreditCard,
    HelpCircle,
    X,
    ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubscriptionPage() {
    const { storeId } = useAuth();
    const [store, setStore] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal checkout state
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'qris'
    const [isProcessing, setIsProcessing] = useState(false);
    const [uniqueCode, setUniqueCode] = useState(0);
    const [copiedAmount, setCopiedAmount] = useState(false);

    const loadData = async () => {
        if (!storeId) return;
        try {
            setLoading(true);
            const [storeData, ordersData] = await Promise.all([
                getStore(storeId),
                getOrdersByStore(storeId),
            ]);
            setStore(storeData);
            setOrders(ordersData || []);

            const walletData = await getStoreWallet(storeId, ordersData || []);
            setWallet(walletData);
        } catch (err) {
            console.error('Error loading subscription data:', err);
            toast.error('Gagal memuat data langganan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [storeId]);

    const subscription = useMemo(() => {
        return getSubscriptionDetails(store);
    }, [store]);

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        const code = Math.floor(100 + Math.random() * 899);
        setUniqueCode(code);
        // Default ke wallet jika saldo cukup, jika tidak default ke QRIS
        if (wallet?.availableBalance >= plan.price) {
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
            const res = await paySubscriptionWithWallet(storeId, selectedPlan.id, orders);
            toast.success(`Selamat! Langganan ${selectedPlan.name} berhasil diaktifkan!`, { id: toastId });
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
        toast.success('Nominal disalin ke clipboard');
        setTimeout(() => setCopiedAmount(false), 2000);
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-500">Memuat status langganan...</p>
                </div>
            </div>
        );
    }

    const availableBalance = wallet?.availableBalance || 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
            {/* Header & Status Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-700/60">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Paket eMakan Pro SaaS</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="text-emerald-300 font-mono">Rp 150.000 / Bulan</span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                            Status & Langganan Toko
                        </h1>
                        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Nikmati seluruh fitur kasir POS multi-meja, QR dinamis, delivery antar ke rumah, serta
                            pembayaran otomatis QRIS Payhook tanpa potongan komisi per transaksi.
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Status Akun:</span>
                                {subscription.status === 'trial' && (
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Free Trial (Uji Coba 14 Hari)
                                    </span>
                                )}
                                {subscription.status === 'active' && (
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Langganan Aktif
                                    </span>
                                )}
                                {subscription.status === 'past_due' && (
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                        Masa Tenggang (Grace Period)
                                    </span>
                                )}
                                {subscription.status === 'expired' && (
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        Kedaluwarsa
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Berlaku Hingga:</span>
                                <span className="text-xs font-mono font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg">
                                    {subscription.expiresAt
                                        ? new Date(subscription.expiresAt).toLocaleDateString('id-ID', {
                                              day: 'numeric',
                                              month: 'long',
                                              year: 'numeric',
                                          })
                                        : 'Belum ditentukan'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Countdown Pill & Quick Wallet Card */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[220px]">
                            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                                <span>Sisa Masa Aktif</span>
                                <Clock className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="text-3xl font-black text-white tracking-tight">
                                {subscription.remainingDays}{' '}
                                <span className="text-sm font-semibold text-slate-300">Hari</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                                {subscription.isExpiringSoon
                                    ? '⚠️ Segera perpanjang agar operasional tidak terhenti'
                                    : 'Operasional resto berjalan normal'}
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[220px]">
                            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                                <span>Saldo Escrow Toko</span>
                                <Wallet className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="text-xl font-bold text-emerald-300">
                                Rp {availableBalance.toLocaleString('id-ID')}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Dapat langsung dipotong untuk perpanjang
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pilihan Paket Langganan SaaS */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-bold text-secondary">Pilih Paket Perpanjangan</h2>
                        <p className="text-sm text-slate-500">
                            Semua paket mendapatkan fitur tanpa batas. Pilih durasi lebih panjang untuk diskon lebih besar.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {SUBSCRIPTION_PLANS.map((plan) => {
                        const isCurrentActive = false;
                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between ${
                                    plan.popular
                                        ? 'bg-white border-2 border-primary shadow-xl shadow-primary/10 ring-4 ring-primary/5'
                                        : 'bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-lg'
                                }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-[11px] font-extrabold tracking-wide uppercase shadow-sm">
                                        Paling Populer
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            {plan.name}
                                        </span>
                                        {plan.badge && (
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    plan.popular
                                                        ? 'bg-primary/10 text-primary border border-primary/20'
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}
                                            >
                                                {plan.badge}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-secondary">
                                                Rp {(plan.price / 1000).toLocaleString('id-ID')}k
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">
                                                / {plan.months} bulan
                                            </span>
                                        </div>
                                        {plan.savings > 0 ? (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-400 line-through">
                                                    Rp {plan.normalPrice.toLocaleString('id-ID')}
                                                </span>
                                                <span className="text-xs font-bold text-emerald-600">
                                                    (Hemat Rp {plan.savings.toLocaleString('id-ID')})
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 mt-1">Rp 150.000 / bulan</p>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                                        {plan.features.map((feat, i) => (
                                            <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        onClick={() => handleSelectPlan(plan)}
                                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                                            plan.popular
                                                ? 'bg-primary hover:bg-primary-dark text-white'
                                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                                        }`}
                                    >
                                        <span>Perpanjang {plan.months} Bulan</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Riwayat Pembayaran Langganan */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-secondary">Riwayat Tagihan & Langganan</h2>
                        <p className="text-xs text-slate-400">
                            Catatan transaksi pembayaran langganan SaaS toko Anda.
                        </p>
                    </div>
                </div>

                {store?.subscriptionHistory && store.subscriptionHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="py-3 px-4">Tanggal Pembayaran</th>
                                    <th className="py-3 px-4">Paket</th>
                                    <th className="py-3 px-4">Nominal</th>
                                    <th className="py-3 px-4">Metode Bayar</th>
                                    <th className="py-3 px-4">Masa Berlaku Sampai</th>
                                    <th className="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
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
                                        <td className="py-3.5 px-4 text-slate-900 font-semibold">
                                            Rp {(item.amount || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {item.paymentMethod === 'wallet_deduction' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                                    <Wallet className="w-3 h-3" /> Potong Saldo Toko
                                                </span>
                                            ) : item.paymentMethod === 'superadmin_override' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                                    Aktivasi Master Superadmin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                    <QrCode className="w-3 h-3" /> QRIS Otomatis
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-slate-600">
                                            {item.expiresAt
                                                ? new Date(item.expiresAt).toLocaleDateString('id-ID', {
                                                      day: 'numeric',
                                                      month: 'long',
                                                      year: 'numeric',
                                                  })
                                                : '-'}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3" /> Lunas
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">Belum ada riwayat perpanjangan</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Semua tagihan langganan yang sudah dibayar akan tercatat otomatis di sini.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Checkout Pembayaran Langganan */}
            {selectedPlan && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-enter">
                        {/* Header Modal */}
                        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                                    Konfirmasi Perpanjangan
                                </span>
                                <h3 className="text-lg font-bold text-white mt-0.5">{selectedPlan.name}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedPlan(null)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 space-y-6">
                            {/* Rincian Tagihan */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                    <span>Durasi Langganan:</span>
                                    <span className="font-bold text-secondary">{selectedPlan.months} Bulan</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                    <span>Biaya Langganan:</span>
                                    <span className="font-bold text-secondary">
                                        Rp {selectedPlan.price.toLocaleString('id-ID')}
                                    </span>
                                </div>
                                {paymentMethod === 'qris' && (
                                    <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span>Kode Unik Verifikasi:</span>
                                        <span className="font-mono font-bold text-primary">+{uniqueCode}</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                                    <span className="text-sm font-extrabold text-secondary">Total Bayar:</span>
                                    <span className="text-lg font-black text-primary">
                                        Rp{' '}
                                        {(paymentMethod === 'qris'
                                            ? selectedPlan.price + uniqueCode
                                            : selectedPlan.price
                                        ).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>

                            {/* Pilih Metode Pembayaran */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Pilih Metode Pembayaran
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Opsi 1: Potong Saldo Toko */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('wallet')}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                            paymentMethod === 'wallet'
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Wallet
                                                className={`w-5 h-5 ${
                                                    paymentMethod === 'wallet' ? 'text-primary' : 'text-slate-400'
                                                }`}
                                            />
                                            {paymentMethod === 'wallet' && (
                                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-secondary">Potong Saldo Resto</div>
                                        <div className="text-[11px] text-slate-400 mt-1">
                                            Tersedia: Rp {availableBalance.toLocaleString('id-ID')}
                                        </div>
                                        {availableBalance < selectedPlan.price && (
                                            <span className="text-[10px] text-rose-500 font-bold block mt-1">
                                                Saldo tidak cukup
                                            </span>
                                        )}
                                    </button>

                                    {/* Opsi 2: QRIS Otomatis Payhook */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('qris')}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                            paymentMethod === 'qris'
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <QrCode
                                                className={`w-5 h-5 ${
                                                    paymentMethod === 'qris' ? 'text-primary' : 'text-slate-400'
                                                }`}
                                            />
                                            {paymentMethod === 'qris' && (
                                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-secondary">Transfer QRIS</div>
                                        <div className="text-[11px] text-slate-400 mt-1">
                                            Semua Bank & e-Wallet
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Konten Berdasarkan Metode Pembayaran */}
                            {paymentMethod === 'wallet' ? (
                                <div className="space-y-4">
                                    {availableBalance >= selectedPlan.price ? (
                                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                                            <div className="flex items-center gap-2 font-bold">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                <span>Saldo Toko Mencukupi!</span>
                                            </div>
                                            <p className="text-[11px] text-emerald-700 leading-relaxed">
                                                Saldo Rp {selectedPlan.price.toLocaleString('id-ID')} akan otomatis dipotong
                                                dari Saldo Siap Tarik Anda. Langganan langsung aktif seketika tanpa perlu
                                                transfer manual.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                                            <div className="flex items-center gap-2 font-bold">
                                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                                <span>Saldo Belum Mencukupi</span>
                                            </div>
                                            <p className="text-[11px] text-rose-700 leading-relaxed">
                                                Saldo siap tarik toko saat ini adalah Rp {availableBalance.toLocaleString('id-ID')},
                                                sedangkan biaya paket adalah Rp {selectedPlan.price.toLocaleString('id-ID')}.
                                                Silakan pilih metode Transfer QRIS di samping.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handlePayWithWallet}
                                        disabled={isProcessing || availableBalance < selectedPlan.price}
                                        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                <span>Memproses Pembayaran...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                <span>Konfirmasi Potong Saldo (Rp {selectedPlan.price.toLocaleString('id-ID')})</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                                            <QRCodeSVG
                                                value={dynamicQrisString}
                                                size={180}
                                                level="M"
                                                includeMargin={true}
                                            />
                                        </div>

                                        <div className="text-center mt-3">
                                            <p className="text-[11px] text-slate-500">Total Transfer Tepat Hingga 3 Digit Terakhir:</p>
                                            <div className="flex items-center justify-center gap-2 mt-1">
                                                <span className="text-lg font-black text-secondary">
                                                    Rp {(selectedPlan.price + uniqueCode).toLocaleString('id-ID')}
                                                </span>
                                                <button
                                                    onClick={() => handleCopyAmount(selectedPlan.price + uniqueCode)}
                                                    className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                                                    title="Salin Nominal"
                                                >
                                                    {copiedAmount ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-amber-600 font-semibold mt-1">
                                                *Kode unik {uniqueCode} wajib dimasukkan persis agar aktivasi otomatis terdeteksi.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
                                        💡 <strong>Setelah transfer berhasil:</strong> Sistem akan otomatis mendeteksi dan
                                        memperpanjang langganan toko Anda. Jika butuh bantuan langsung hubungi Superadmin di menu WhatsApp bantuan.
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedPlan(null)}
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                        Tutup / Nanti Saja
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
