import { useState, useEffect, useMemo, useCallback } from 'react';
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
    TrendingUp,
    Copy,
    Check,
    ArrowDownRight,
    HelpCircle,
    Banknote,
    BadgeAlert,
} from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function WalletPage() {
    const { storeId } = useAuth();
    const [orders, setOrders] = useState([]);
    const [walletData, setWalletData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [copiedAccount, setCopiedAccount] = useState(false);

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

    const loadWallet = useCallback(async (ordersList = orders) => {
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
    }, [storeId, orders]);

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
    }, [storeId, loadWallet]);

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

    const handleCopyAccount = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedAccount(true);
        toast.success('Nomor rekening disalin');
        setTimeout(() => setCopiedAccount(false), 2000);
    };

    // Preset chips for withdrawal amount
    const handlePresetAmount = (val) => {
        if (val === 'all') {
            setWithdrawAmount(String(walletData?.availableBalance || 0));
        } else {
            const current = parseInt(withdrawAmount, 10) || 0;
            const updated = Math.min(walletData?.availableBalance || 0, current + val);
            setWithdrawAmount(String(updated));
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

    const pendingWithdrawalsCount = useMemo(() => {
        const list = walletData?.withdrawals || [];
        return list.filter((w) => w.status === 'pending').length;
    }, [walletData?.withdrawals]);

    if (loading) return <Spinner text="Memuat data saldo & mutasi..." />;

    const availableBalance = walletData?.availableBalance || 0;

    return (
        <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-secondary flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-primary" />
                        <span>Saldo & Penarikan Dana</span>
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                        Kelola penerimaan transaksi QRIS toko dan ajukan pencairan ke rekening operasional Anda
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-border hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : 'text-slate-400'}`} />
                    <span>Perbarui Data</span>
                </button>
            </div>

            {/* 2. Top Financial KPI Cards (Clean White Theme, matching Report & Dashboard) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Saldo Tersedia */}
                <div className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Saldo Siap Tarik
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-secondary font-mono tracking-tight">
                            {formatPrice(availableBalance)}
                        </p>
                        <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Dapat dicairkan ke rekening</span>
                        </p>
                    </div>
                </div>

                {/* Saldo Sedang Diproses */}
                <div className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Sedang Diproses
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-secondary font-mono tracking-tight">
                            {formatPrice(walletData?.pendingBalance || 0)}
                        </p>
                        <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                            <span>{pendingWithdrawalsCount} pengajuan menunggu transfer</span>
                        </p>
                    </div>
                </div>

                {/* Total Pemasukan QRIS */}
                <div className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Total Masuk QRIS
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-secondary font-mono tracking-tight">
                            {formatPrice(walletData?.grossRevenue || 0)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1.5">
                            Dari {walletData?.paidOrdersCount || 0} pesanan QRIS lunas
                        </p>
                    </div>
                </div>

                {/* Total Berhasil Dicairkan */}
                <div className="bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Total Dicairkan
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <Banknote className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-secondary font-mono tracking-tight">
                            {formatPrice(walletData?.totalWithdrawn || 0)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1.5">
                            Telah ditransfer ke rekening toko
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Core Action Section (Tarik Saldo & Rekening Pencairan) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Panel Kiri: Pengajuan Pencairan Dana */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between space-y-6">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div>
                                <h2 className="text-base font-bold text-secondary flex items-center gap-2">
                                    <span>Pencairan Dana (Tarik Saldo)</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Transfer saldo hasil penjualan QRIS langsung ke rekening bank atau akun e-wallet Anda
                                </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Biaya Admin: Gratis (Rp 0)
                            </span>
                        </div>

                        {/* Ringkasan status siap tarik */}
                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                    Nominal Siap Ditarik
                                </span>
                                <span className="text-2xl font-extrabold text-secondary font-mono mt-1 block">
                                    {formatPrice(availableBalance)}
                                </span>
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    Minimal penarikan: {formatPrice(MIN_WITHDRAWAL_AMOUNT)}
                                </span>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                    Rekening Penerima
                                </span>
                                {walletData?.bankAccount ? (
                                    <div className="mt-1">
                                        <p className="text-sm font-bold text-secondary">
                                            {walletData.bankAccount.bankName}
                                        </p>
                                        <p className="text-xs font-mono text-slate-600">
                                            {walletData.bankAccount.accountNumber} • a.n. {walletData.bankAccount.accountHolder}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-amber-700 font-medium mt-1">
                                        Rekening belum diatur. Mohon atur rekening terlebih dahulu.
                                    </p>
                                )}
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    Estimasi proses: 1x24 jam kerja
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tombol Eksekusi Tarik Saldo */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (!walletData?.bankAccount?.accountNumber) {
                                    setShowBankModal(true);
                                    toast('Silakan masukkan nomor rekening tujuan terlebih dahulu', { icon: 'ℹ️' });
                                } else if (availableBalance < MIN_WITHDRAWAL_AMOUNT) {
                                    toast.error(`Saldo belum mencukupi (Minimal penarikan ${formatPrice(MIN_WITHDRAWAL_AMOUNT)})`);
                                } else {
                                    setShowWithdrawModal(true);
                                }
                            }}
                            className="flex-1 py-3 px-5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Tarik Saldo Sekarang</span>
                        </button>

                        {!walletData?.bankAccount && (
                            <button
                                type="button"
                                onClick={() => setShowBankModal(true)}
                                className="py-3 px-4 rounded-xl border border-border hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                            >
                                Atur Rekening
                            </button>
                        )}
                    </div>
                </div>

                {/* Panel Kanan: Kartu Rekening Pencairan */}
                <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary" />
                                <span>Rekening Pencairan</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowBankModal(true)}
                                className="text-xs font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer"
                            >
                                {walletData?.bankAccount ? 'Ubah' : '+ Tambah'}
                            </button>
                        </div>

                        {walletData?.bankAccount ? (
                            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary">
                                        {walletData.bankAccount.bankName}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Aktif</span>
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                        Nomor Rekening / E-Wallet:
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-base font-extrabold font-mono text-secondary tracking-wider">
                                            {walletData.bankAccount.accountNumber}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyAccount(walletData.bankAccount.accountNumber)}
                                            className="p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors cursor-pointer"
                                            title="Salin Nomor"
                                        >
                                            {copiedAccount ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                                        Nama Pemilik:
                                    </span>
                                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                                        {walletData.bankAccount.accountHolder}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 p-5 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                                <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
                                <p className="text-xs font-bold text-slate-700">Belum Ada Rekening Terdaftar</p>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Tambahkan nomor rekening BCA, Mandiri, BRI, BNI atau akun GoPay/DANA/OVO Anda untuk mencairkan saldo.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowBankModal(true)}
                            className="w-full py-2.5 px-3 rounded-xl border border-border hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span>{walletData?.bankAccount ? 'Perbarui Data Rekening' : 'Atur Rekening Sekarang'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. Riwayat Penarikan Dana Section (Clean Table with Filters) */}
            <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
                <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="font-bold text-secondary text-base">Riwayat Penarikan Saldo</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Daftar permintaan pencairan dana toko ke rekening bank / e-wallet
                        </p>
                    </div>

                    {/* Filter Segmented Control */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
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
                        <Coins className="w-10 h-10 mx-auto text-slate-300" />
                        <h4 className="font-semibold text-sm text-slate-600">Tidak Ada Riwayat Penarikan</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Pengajuan penarikan dana beserta status transfer dan mutasi rekening akan ditampilkan secara real-time di sini.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-border bg-slate-50/70 text-slate-500 uppercase text-[10px] tracking-wider">
                                    <th className="py-3 px-4 font-semibold">ID & Waktu</th>
                                    <th className="py-3 px-4 font-semibold">Rekening Penerima</th>
                                    <th className="py-3 px-4 font-semibold">Nominal Dicairkan</th>
                                    <th className="py-3 px-4 font-semibold">Status Penarikan</th>
                                    <th className="py-3 px-4 font-semibold">Catatan / Bukti</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredWithdrawals.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <span className="font-mono font-bold text-secondary">{item.id}</span>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(item.createdAt)}</p>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-secondary">
                                                {item.bankName} • <span className="font-mono">{item.accountNumber}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">a.n. {item.accountHolder}</p>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <span className="font-mono font-bold text-sm text-secondary">
                                                {formatPrice(item.amount)}
                                            </span>
                                            <span className="block text-[10px] text-slate-400">Biaya: Rp 0 (Gratis)</span>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            {item.status === 'completed' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil Ditransfer
                                                </span>
                                            )}
                                            {item.status === 'pending' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Clock className="w-3.5 h-3.5" /> Menunggu Transfer
                                                </span>
                                            )}
                                            {item.status === 'rejected' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                                    <X className="w-3.5 h-3.5" /> Ditolak
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                                            {item.status === 'completed' && item.completedAt ? (
                                                <span>Ditransfer pada: {formatDate(item.completedAt)}</span>
                                            ) : item.status === 'rejected' && item.rejectReason ? (
                                                <span className="text-rose-600 font-medium">Alasan: {item.rejectReason}</span>
                                            ) : (
                                                <span>{item.notes || 'Pencairan omset resto'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 5. Modal Form Tarik Saldo (Clean & Crisp) */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                    <ArrowUpRight className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-sm text-secondary">Pengajuan Tarik Saldo</h3>
                            </div>
                            <button
                                onClick={() => setShowWithdrawModal(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Balance Info Banner */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    Saldo Tersedia:
                                </span>
                                <p className="text-lg font-bold text-secondary font-mono">
                                    {formatPrice(availableBalance)}
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
                                    Nominal Penarikan
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                        Rp
                                    </span>
                                    <input
                                        type="number"
                                        min={MIN_WITHDRAWAL_AMOUNT}
                                        max={availableBalance}
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-base font-bold font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Rekening Penerima:
                                </span>
                                <p className="font-bold text-secondary">
                                    {walletData?.bankAccount?.bankName} • {walletData?.bankAccount?.accountNumber}
                                </p>
                                <p className="text-slate-500 text-[11px]">a.n. {walletData?.bankAccount?.accountHolder}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Catatan Penarikan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={withdrawNotes}
                                    onChange={(e) => setWithdrawNotes(e.target.value)}
                                    placeholder="Contoh: Pencairan omset mingguan"
                                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submittingWithdraw}
                                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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

            {/* 6. Modal Form Rekening Bank / E-Wallet (Clean & Crisp) */}
            {showBankModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-sm text-secondary">Pengaturan Rekening Pencairan</h3>
                            </div>
                            <button
                                onClick={() => setShowBankModal(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
                                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>

                            <p className="text-[11px] text-slate-400 leading-snug">
                                Pastikan nama pemilik rekening sesuai persis dengan buku tabungan atau akun e-wallet agar proses transfer tidak tertolak.
                            </p>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={savingBank}
                                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
