import { getStore, updateStore } from './storeService';
import { broadcastOrderChange } from './orderService';

export const POPULAR_BANKS = [
    { code: 'BCA', name: 'Bank Central Asia (BCA)', type: 'bank' },
    { code: 'MANDIRI', name: 'Bank Mandiri', type: 'bank' },
    { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)', type: 'bank' },
    { code: 'BNI', name: 'Bank Negara Indonesia (BNI)', type: 'bank' },
    { code: 'BSI', name: 'Bank Syariah Indonesia (BSI)', type: 'bank' },
    { code: 'CIMB', name: 'CIMB Niaga', type: 'bank' },
    { code: 'PERMATA', name: 'Bank Permata', type: 'bank' },
    { code: 'GOPAY', name: 'GoPay', type: 'ewallet' },
    { code: 'OVO', name: 'OVO', type: 'ewallet' },
    { code: 'DANA', name: 'DANA', type: 'ewallet' },
    { code: 'SHOPEEPAY', name: 'ShopeePay', type: 'ewallet' },
];

export const MIN_WITHDRAWAL_AMOUNT = 20000;

/**
 * Hitung kalkulasi saldo Escrow dari pesanan dan penarikan
 */
export function calculateWalletSummary(orders = [], withdrawals = []) {
    // 1. Total Pemasukan dari pesanan yang sudah lunas
    const paidOrders = orders.filter(
        (o) =>
            (o.paymentStatus === 'paid' || o.status === 'completed') &&
            o.status !== 'cancelled' &&
            o.orderType !== 'customer_chat' &&
            o.orderType !== 'inquiry'
    );

    const grossRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

    // 2. Hitung penarikan
    const completedPayouts = withdrawals
        .filter((w) => w.status === 'completed')
        .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    const pendingPayouts = withdrawals
        .filter((w) => w.status === 'pending')
        .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    const availableBalance = Math.max(0, grossRevenue - completedPayouts - pendingPayouts);

    return {
        grossRevenue,
        availableBalance,
        pendingBalance: pendingPayouts,
        totalWithdrawn: completedPayouts,
        paidOrdersCount: paidOrders.length,
    };
}

/**
 * Ambil data dompet dan riwayat penarikan toko
 */
export async function getStoreWallet(storeId, orders = []) {
    if (!storeId) return null;
    const store = await getStore(storeId);
    if (!store) return null;

    const withdrawals = Array.isArray(store.withdrawals) ? store.withdrawals : [];
    const summary = calculateWalletSummary(orders, withdrawals);

    return {
        ...summary,
        bankAccount: store.bankAccount || null,
        withdrawals: withdrawals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        storeName: store.name || 'Restoran',
    };
}

/**
 * Simpan rekening bank atau nomor e-wallet pencairan
 */
export async function saveStoreBankAccount(storeId, bankAccount) {
    if (!storeId) throw new Error('ID Toko tidak valid');
    if (!bankAccount?.bankName || !bankAccount?.accountNumber || !bankAccount?.accountHolder) {
        throw new Error('Informasi rekening belum lengkap');
    }

    const payload = {
        bankName: bankAccount.bankName.trim(),
        accountNumber: bankAccount.accountNumber.trim(),
        accountHolder: bankAccount.accountHolder.trim(),
        updatedAt: new Date().toISOString(),
    };

    await updateStore(storeId, { bankAccount: payload });
    return payload;
}

/**
 * Buat pengajuan penarikan saldo (Withdrawal Request)
 */
export async function submitWithdrawalRequest(storeId, { amount, bankAccount, notes }, orders = []) {
    if (!storeId) throw new Error('ID Toko tidak valid');

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < MIN_WITHDRAWAL_AMOUNT) {
        throw new Error(`Minimal penarikan adalah Rp ${MIN_WITHDRAWAL_AMOUNT.toLocaleString('id-ID')}`);
    }

    const store = await getStore(storeId);
    if (!store) throw new Error('Data toko tidak ditemukan');

    const currentWithdrawals = Array.isArray(store.withdrawals) ? store.withdrawals : [];
    const summary = calculateWalletSummary(orders, currentWithdrawals);

    if (numAmount > summary.availableBalance) {
        throw new Error(`Saldo tersedia tidak mencukupi (Tersedia: Rp ${summary.availableBalance.toLocaleString('id-ID')})`);
    }

    const targetBank = bankAccount || store.bankAccount;
    if (!targetBank?.bankName || !targetBank?.accountNumber || !targetBank?.accountHolder) {
        throw new Error('Rekening tujuan pencairan belum ditentukan');
    }

    const newWithdrawal = {
        id: `WD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        storeId,
        amount: numAmount,
        bankName: targetBank.bankName,
        accountNumber: targetBank.accountNumber,
        accountHolder: targetBank.accountHolder,
        status: 'pending', // pending, completed, rejected
        createdAt: new Date().toISOString(),
        completedAt: null,
        notes: notes?.trim() || 'Penarikan saldo escrow resto',
        adminFee: 0,
        netAmount: numAmount,
    };

    const updatedWithdrawals = [newWithdrawal, ...currentWithdrawals];

    await updateStore(storeId, {
        withdrawals: updatedWithdrawals,
        bankAccount: targetBank,
    });

    // Broadcast agar UI real-time terupdate
    broadcastOrderChange({
        storeId,
        type: 'withdrawal_request',
        withdrawalId: newWithdrawal.id,
        amount: numAmount,
    });

    return newWithdrawal;
}

/**
 * Update status penarikan saldo (bisa dipanggil dari Portal Master Admin)
 */
export async function updateWithdrawalStatus(storeId, withdrawalId, status, rejectReason = '') {
    if (!storeId || !withdrawalId) throw new Error('Parameter tidak lengkap');

    const store = await getStore(storeId);
    if (!store) throw new Error('Data toko tidak ditemukan');

    const currentWithdrawals = Array.isArray(store.withdrawals) ? store.withdrawals : [];
    const updatedWithdrawals = currentWithdrawals.map((w) => {
        if (w.id === withdrawalId) {
            return {
                ...w,
                status,
                completedAt: status === 'completed' ? new Date().toISOString() : w.completedAt,
                rejectReason: status === 'rejected' ? rejectReason : null,
            };
        }
        return w;
    });

    await updateStore(storeId, { withdrawals: updatedWithdrawals });

    broadcastOrderChange({
        storeId,
        type: 'withdrawal_status_change',
        withdrawalId,
        status,
    });

    return true;
}
