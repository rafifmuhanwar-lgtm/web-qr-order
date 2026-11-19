import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToOrders } from '../../services/orderService';
import {
    POPULAR_BANKS,
    MIN_WITHDRAWAL_AMOUNT,
    getStoreWallet,
    saveStoreBankAccount,
    submitWithdrawalRequest,
} from '../../services/walletService';
import {
    Wallet,
    ArrowUpRight,
    Building2,
    CreditCard,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    RefreshCw,
    ShieldCheck,
    Coins,
    ChevronRight,
    TrendingUp,
    Receipt,
    Sparkles,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function WalletPage() {
    const { storeId, storeData } = useAuth();
    const [orders, setOrders] = useState([]);
    const [walletData, setWalletData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state for Withdrawal
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawNotes, setWithdrawNotes] = useState('');
    const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

    // Form state for Bank Account Settings
    const [showBankModal, setShowBankModal] = useState(false);
    const [selectedBank, setSelectedBank] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [savingBank, setSavingBank] = useState(false);

    // Filter tab for withdrawal history
    const [historyFilter, setHistoryFilter] = useState('all'); // all, pending, completed, rejected

    const loadWallet = async (ordersList = orders) => {
        if (!storeId) return;
        try {
            const data = await getStoreWallet(storeId, ordersList);
            setWalletData(data);
            if (data?.bankAccount) {
                setSelectedBank(data.bankAccount.bankName || '');
                setAccountNumber(data.bankAccount.accountNumber || '');
                setAccountHolder(data.bankAccount.accountHolder || '');
            }
        } catch (err) {
            console.error('Error loading wallet:', err);
        }
    };

    useEffect(() => {
        if (!storeId) return;
        const unsubscribe = subscribeToOrders(
            storeId,
            (newOrders) => {
                setOrders(newOrders);
                loadWallet(newOrders);
                setLoading(false);
            },
            (err) => {
                console.error('Orders sync error in wallet:', err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [storeId]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadWallet();
        toast.success('Data saldo diperbarui');
        setRefreshing(false);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price || 0);
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        const d = new Date(isoString);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Preset chips for withdrawal amount
    const handlePresetAmount = (val) => {
        if (val === 'all') {
            setWithdrawAmount(String(walletData?.availableBalance || 0));
        } else {
            setWithdrawAmount(String(val));
        }
    };

    const handleSaveBankAccount = async (e) => {
        e.preventDefault();
        if (!selectedBank.trim()) {
            toast.error('Pilih nama bank atau e-wallet');
            return;
        }
        if (!accountNumber.trim()) {
            toast.error('Masukkan nomor rekening / no. e-wallet');
            return;
        }
        if (!accountHolder.trim()) {
            toast.error('Masukkan nama pemilik rekening');
            return;
        }

        setSavingBank(true);
        try {
            const saved = await saveStoreBankAccount(storeId, {
                bankName: selectedBank,
                accountNumber,
                accountHolder,
            });
            setWalletData((prev) => ({ ...prev, bankAccount: saved }));
            toast.success('Rekening pencairan berhasil disimpan');
            setShowBankModal(false);
        } catch (err) {
            toast.error(err.message || 'Gagal menyimpan rekening');
        } finally {
            setSavingBank(false);
        }
    };

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        const num = parseInt(withdrawAmount, 10);
        if (isNaN(num) || num < MIN_WITHDRAWAL_AMOUNT) {
            toast.error(`Minimal penarikan adalah ${formatPrice(MIN_WITHDRAWAL_AMOUNT)}`);
            return;
        }

        if (num > (walletData?.availableBalance || 0)) {
            toast.error('Jumlah penarikan melebihi saldo tersedia');
            return;
        }

        if (!walletData?.bankAccount?.accountNumber) {
            toast.error('Silakan atur rekening tujuan pencairan terlebih dahulu');
            setShowWithdrawModal(false);
            setShowBankModal(true);
            return;
        }

        setSubmittingWithdraw(true);
        try {
            await submitWithdrawalRequest(
                storeId,
                {
                    amount: num,
                    bankAccount: walletData.bankAccount,
                    notes: withdrawNotes,
                },
                orders
            );

            await loadWallet();
            toast.success('Pengajuan penarikan berhasil dikirim! Admin akan memproses transfer.');
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            setWithdrawNotes('');
        } catch (err) {
            toast.error(err.message || 'Gagal mengajukan penarikan');
        } finally {
            setSubmittingWithdraw(false);
        }
    };

    const filteredWithdrawals = useMemo(() => {
        const list = walletData?.withdrawals || [];
        if (historyFilter === 'all') return list;
        return list.filter((w) => w.status === historyFilter);
    }, [walletData?.withdrawals, historyFilter]);

    if (loading) return <Spinner text="Memuat data saldo escrow..." />;

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-secondary flex items-center gap-2">
                        <Wallet className="w-7 h-7 text-primary" />
                        <span>Saldo & Penarikan (Escrow)</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Kelola saldo transaksi QRIS restoran dan ajukan pencairan ke rekening Anda
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                    <span>Perbarui Data</span>
                </button>
            </div>

            {/* Escrow Hero Banner */}
            <div className="bg-gradient-to-br from-secondary via-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/20 px-2.5 py-1 rounded-full border border-primary/30 inline-flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                Escrow Account • Aman & Transparan
                            </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium">Saldo Tersedia (Siap Ditarik):</p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
                            {formatPrice(walletData?.availableBalance || 0)}
                        </h2>
                        <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 flex-wrap">
                            <span>
                                Saldo Diproses:{' '}
                                <strong className="text-amber-400 font-mono">
                                    {formatPrice(walletData?.pendingBalance || 0)}
                                </strong>
                            </span>
                            <span>•</span>
                            <span>
                                Total Masuk QRIS:{' '}
                                <strong className="text-emerald-400 font-mono">
                                    {formatPrice(walletData?.grossRevenue || 0)}
                                </strong>
                            </span>
                        </div>
                    </div>

                    {/* CTA Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (!walletData?.bankAccount?.accountNumber) {
                                    setShowBankModal(true);
                                    toast('Mohon masukkan rekening pencairan terlebih dahulu', { icon: 'ℹ️' });
                                } else if ((walletData?.availableBalance || 0) < MIN_WITHDRAWAL_AMOUNT) {
                                    toast.error(`Saldo belum mencukupi (Minimal penarikan ${formatPrice(MIN_WITHDRAWAL_AMOUNT)})`);
                                } else {
                                    setShowWithdrawModal(true);
                                }
                            }}
                            className="px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            <ArrowUpRight className="w-5 h-5" />
                            <span>Tarik Saldo Sekarang</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowBankModal(true)}
                            className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            <CreditCard className="w-4 h-4 text-slate-300" />
                            <span>{walletData?.bankAccount ? 'Ubah Rekening' : 'Atur Rekening'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Rekening Info Card */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xs text-secondary uppercase tracking-wider">Rekening Tujuan Pencairan</h3>
                            {walletData?.bankAccount ? (
                                <p className="text-sm font-bold text-slate-800 mt-0.5">
                                    {walletData.bankAccount.bankName} •{' '}
                                    <span className="font-mono text-primary">{walletData.bankAccount.accountNumber}</span>{' '}
                                    <span className="text-xs text-slate-500 font-normal">
                                        (a.n. {walletData.bankAccount.accountHolder})
                                    </span>
                                </p>
                            ) : (
                                <p className="text-xs text-amber-600 font-medium mt-0.5">
                                    Belum ada rekening terdaftar. Silakan atur untuk mencairkan saldo.
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowBankModal(true)}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                        {walletData?.bankAccount ? 'Ganti Rekening' : '+ Tambah Rekening'}
                    </button>
                </div>
            </div>

            {/* Riwayat Penarikan Dana Section */}
            <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
                <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="font-bold text-secondary text-base">Riwayat Penarikan Dana</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Daftar permintaan transfer saldo escrow ke rekening restoran</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                        {[
                            { key: 'all', label: 'Semua' },
                            { key: 'pending', label: 'Menunggu' },
                            { key: 'completed', label: 'Berhasil' },
                            { key: 'rejected', label: 'Ditolak' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setHistoryFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    historyFilter === tab.key
                                        ? 'bg-white text-secondary shadow-xs font-bold'
                                        : 'text-slate-500 hover:text-secondary'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredWithdrawals.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 space-y-2">
                        <Coins className="w-12 h-12 mx-auto text-slate-300 opacity-60" />
                        <h4 className="font-semibold text-sm text-slate-600">Belum Ada Riwayat Penarikan</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Saat Anda mengajukan penarikan saldo, rincian status transfer dan mutasi akan tercatat rapi di sini.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filteredWithdrawals.map((item) => (
                            <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-secondary">{item.id}</span>
                                        {item.status === 'completed' && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                ✓ Berhasil Ditransfer
                                            </span>
                                        )}
                                        {item.status === 'pending' && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                                ⏳ Menunggu Transfer
                                            </span>
                                        )}
                                        {item.status === 'rejected' && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                                ✕ Ditolak
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-600">
                                        Tujuan: <strong className="text-secondary">{item.bankName}</strong> ({item.accountNumber}) a.n. {item.accountHolder}
                                    </p>
                                    <p className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</p>
                                </div>

                                <div className="text-left sm:text-right">
                                    <p className="text-base font-extrabold text-secondary font-mono">
                                        {formatPrice(item.amount)}
                                    </p>
                                    <p className="text-[10px] text-emerald-600 font-medium">Biaya Admin: Gratis (Rp 0)</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Form Tarik Saldo */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <ArrowUpRight className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-sm text-secondary">Pengajuan Tarik Saldo</h3>
                            </div>
                            <button
                                onClick={() => setShowWithdrawModal(false)}
                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Balance Banner */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Saldo Tersedia:</span>
                                <p className="text-lg font-bold text-secondary font-mono">
                                    {formatPrice(walletData?.availableBalance || 0)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handlePresetAmount('all')}
                                className="px-3 py-1 bg-white border border-slate-200 hover:border-primary text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                            >
                                Tarik Semua
                            </button>
                        </div>

                        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Nominal Penarikan (Rp)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                                    <input
                                        type="number"
                                        min={MIN_WITHDRAWAL_AMOUNT}
                                        max={walletData?.availableBalance || 0}
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0"
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border text-base font-bold font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="flex gap-1.5 mt-2 flex-wrap">
                                    {[50000, 100000, 250000, 500000].map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => handlePresetAmount(preset)}
                                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors cursor-pointer text-slate-600"
                                        >
                                            +{formatPrice(preset)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Destination Account Box */}
                            <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-3.5 text-xs space-y-1 text-orange-950">
                                <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Rekening Tujuan:</span>
                                <p className="font-bold">
                                    {walletData?.bankAccount?.bankName} • {walletData?.bankAccount?.accountNumber}
                                </p>
                                <p className="text-slate-600 text-[11px]">a.n. {walletData?.bankAccount?.accountHolder}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Catatan / Keterangan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={withdrawNotes}
                                    onChange={(e) => setWithdrawNotes(e.target.value)}
                                    placeholder="Contoh: Pencairan omset mingguan"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submittingWithdraw}
                                    className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submittingWithdraw ? (
                                        <span>Mengirim Pengajuan...</span>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Konfirmasi & Ajukan Penarikan</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Form Rekening Bank / E-Wallet */}
            {showBankModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-sm text-secondary">Pengaturan Rekening Pencairan</h3>
                            </div>
                            <button
                                onClick={() => setShowBankModal(false)}
                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveBankAccount} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Pilih Bank / E-Wallet
                                </label>
                                <select
                                    value={selectedBank}
                                    onChange={(e) => setSelectedBank(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                                >
                                    <option value="">-- Pilih Bank / E-Wallet --</option>
                                    <optgroup label="Bank Nasional">
                                        {POPULAR_BANKS.filter((b) => b.type === 'bank').map((b) => (
                                            <option key={b.code} value={b.name}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="E-Wallet">
                                        {POPULAR_BANKS.filter((b) => b.type === 'ewallet').map((b) => (
                                            <option key={b.code} value={b.name}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Nomor Rekening / No. HP E-Wallet
                                </label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder="Contoh: 1234567890 atau 08123456789"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Nama Pemilik Rekening (Sesuai Buku Tabungan/KTP)
                                </label>
                                <input
                                    type="text"
                                    value={accountHolder}
                                    onChange={(e) => setAccountHolder(e.target.value)}
                                    placeholder="Contoh: Budi Santoso"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>

                            <p className="text-[11px] text-slate-400 leading-snug">
                                Pastikan nama pemilik rekening sesuai persis dengan buku tabungan atau akun e-wallet agar proses transfer tidak tertolak.
                            </p>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={savingBank}
                                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/25 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {savingBank ? 'Menyimpan...' : 'Simpan Rekening'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
