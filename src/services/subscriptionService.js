import { getStore, updateStore } from './storeService';
import { calculateWalletSummary } from './walletService';
import { broadcastOrderChange } from './orderService';

export const MONTHLY_SUBSCRIPTION_FEE = 150000; // Rp 150.000 / bulan sesuai instruksi user

export const SUBSCRIPTION_PLANS = [
    {
        id: '1_month',
        name: 'Paket Bulanan',
        periodLabel: '1 Bulan',
        months: 1,
        price: 150000,
        normalPrice: 150000,
        savings: 0,
        perMonth: 150000,
        badge: 'Reguler',
        popular: false,
        features: [
            'Akses Penuh Semua Meja QR',
            'Order Online & Delivery Antar',
            'Laporan Keuangan',
            'Bantuan Operasional',
        ],
    },
    {
        id: '3_months',
        name: 'Paket Kuartal',
        periodLabel: '3 Bulan',
        months: 3,
        price: 420000,
        normalPrice: 450000,
        savings: 30000,
        perMonth: 140000,
        badge: 'Hemat Rp 30.000',
        popular: false,
        features: [
            'Semua fitur Paket Bulanan',
            'Tarif hemat Rp 140.000 / bulan',
            'Gratis konsultasi setup menu awal',
            'Prioritas antrean bantuan teknis',
        ],
    },
    {
        id: '12_months',
        name: 'Paket Tahunan',
        periodLabel: '1 Tahun (12 Bulan)',
        months: 12,
        price: 1500000,
        normalPrice: 1800000,
        savings: 300000,
        perMonth: 125000,
        badge: 'Paling Hemat • Gratis 2 Bulan',
        popular: true,
        features: [
            'Semua fitur komplit eMakan Cloud',
            'Tarif termurah Rp 125.000 / bulan',
            'Hemat langsung Rp 300.000 (Setara 2 Bulan Gratis)',
            'Dedicated Technical Support WhatsApp',
            'Jaminan uptime operasional resto',
        ],
    },
];

/**
 * Menghitung sisa hari dan status masa aktif langganan toko
 */
export function getSubscriptionDetails(store) {
    if (!store) {
        return {
            status: 'expired',
            isActive: false,
            remainingDays: 0,
            remainingHours: 0,
            expiresAt: null,
            isTrial: false,
            isGracePeriod: false,
        };
    }

    const rawExpiry = store.subscriptionExpiresAt || store.subscription_expires_at;
    const expiresAt = rawExpiry ? new Date(rawExpiry) : null;
    const now = new Date();

    if (!expiresAt) {
        return {
            status: 'trial',
            isActive: true,
            remainingDays: 14,
            remainingHours: 336,
            expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            isTrial: true,
            isGracePeriod: false,
        };
    }

    const diffMs = expiresAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const remainingHours = Math.ceil(diffMs / (1000 * 60 * 60));

    let status = store.subscriptionStatus || store.subscription_status || 'active';
    let isActive = true;
    let isGracePeriod = false;

    if (status === 'suspended') {
        isActive = false;
    } else if (diffMs <= 0) {
        // Cek masa tenggang (grace period) 3 hari
        const graceEndMs = expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000;
        if (now.getTime() <= graceEndMs) {
            status = 'past_due';
            isActive = true; // Masih bisa buka menu tapi ada banner darurat
            isGracePeriod = true;
        } else {
            status = 'expired';
            isActive = false;
        }
    }

    const isTrial = status === 'trial';

    return {
        status,
        isActive,
        remainingDays: Math.max(0, remainingDays),
        remainingHours: Math.max(0, remainingHours),
        expiresAt: expiresAt.toISOString(),
        isTrial,
        isGracePeriod,
        isExpiringSoon: isActive && remainingDays <= 3,
    };
}

/**
 * Bayar langganan menggunakan Saldo Escrow Toko (Otomatis & Seketika)
 */
export async function paySubscriptionWithWallet(storeId, planId, orders = []) {
    if (!storeId) throw new Error('ID Toko tidak valid');
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) throw new Error('Paket langganan tidak valid');

    const store = await getStore(storeId);
    if (!store) throw new Error('Toko tidak ditemukan');

    const withdrawals = Array.isArray(store.withdrawals) ? store.withdrawals : [];
    const walletSummary = calculateWalletSummary(orders, withdrawals);

    if (walletSummary.availableBalance < plan.price) {
        throw new Error(
            `Saldo toko tidak mencukupi. Diperlukan Rp ${plan.price.toLocaleString('id-ID')}, saldo tersedia Rp ${walletSummary.availableBalance.toLocaleString('id-ID')}. Silakan gunakan metode QRIS.`
        );
    }

    // 1. Tentukan tanggal kedaluwarsa baru
    const currentExpiry = store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    
    // Tambahkan jumlah bulan
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + plan.months);

    // 2. Buat catatan potongan saldo di withdrawals toko
    const paymentId = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newDeduction = {
        id: paymentId,
        amount: plan.price,
        type: 'subscription_payment',
        bankName: 'eMakan Cloud SaaS',
        accountNumber: 'SYSTEM-INTERNAL',
        accountHolder: `Perpanjangan ${plan.name}`,
        notes: `Pembayaran Langganan ${plan.name} (${plan.months} Bulan)`,
        status: 'completed',
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
    };

    // 3. Catat di riwayat langganan (subscriptionHistory)
    const historyEntry = {
        id: paymentId,
        planId: plan.id,
        planName: plan.name,
        months: plan.months,
        amount: plan.price,
        paymentMethod: 'wallet_deduction',
        paidAt: new Date().toISOString(),
        expiresAt: newExpiry.toISOString(),
    };

    const updatedWithdrawals = [newDeduction, ...withdrawals];
    const updatedHistory = [historyEntry, ...(Array.isArray(store.subscriptionHistory) ? store.subscriptionHistory : [])];

    // 4. Update data toko ke Supabase
    await updateStore(storeId, {
        withdrawals: updatedWithdrawals,
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: newExpiry.toISOString(),
        subscriptionHistory: updatedHistory,
    });

    // Broadcast agar UI real-time terupdate
    broadcastOrderChange({ storeId, action: 'subscription_updated' });

    return {
        success: true,
        newExpiry: newExpiry.toISOString(),
        plan,
        paymentId,
    };
}

/**
 * Perpanjang langganan (Superadmin override atau auto QRIS confirmation)
 */
export async function extendStoreSubscription(storeId, monthsToAdd, paymentDetails = {}) {
    if (!storeId) throw new Error('ID Toko tidak valid');
    const store = await getStore(storeId);
    if (!store) throw new Error('Toko tidak ditemukan');

    const currentExpiry = store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();

    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + Number(monthsToAdd));

    const paymentId = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const historyEntry = {
        id: paymentId,
        planId: `${monthsToAdd}_months`,
        planName: `Paket ${monthsToAdd} Bulan`,
        months: Number(monthsToAdd),
        amount: paymentDetails.amount || (MONTHLY_SUBSCRIPTION_FEE * monthsToAdd),
        paymentMethod: paymentDetails.method || 'superadmin_override',
        referenceNumber: paymentDetails.referenceNumber || null,
        paidAt: new Date().toISOString(),
        expiresAt: newExpiry.toISOString(),
        notes: paymentDetails.notes || 'Perpanjangan oleh Admin',
    };

    const updatedHistory = [historyEntry, ...(Array.isArray(store.subscriptionHistory) ? store.subscriptionHistory : [])];

    await updateStore(storeId, {
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: newExpiry.toISOString(),
        subscriptionHistory: updatedHistory,
    });

    broadcastOrderChange({ storeId, action: 'subscription_updated' });

    return {
        success: true,
        newExpiry: newExpiry.toISOString(),
    };
}

/**
 * Tambah masa aktif dalam hitungan hari (misal +14 hari trial atau kompensasi)
 */
export async function extendStoreDays(storeId, daysToAdd = 14, paymentDetails = {}) {
    if (!storeId) throw new Error('ID Toko tidak valid');
    const store = await getStore(storeId);
    if (!store) throw new Error('Toko tidak ditemukan');

    const currentExpiry = store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();

    const newExpiry = new Date(baseDate.getTime() + Number(daysToAdd) * 24 * 60 * 60 * 1000);

    const paymentId = `EXT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const historyEntry = {
        id: paymentId,
        planId: `${daysToAdd}_days`,
        planName: `Ekstra ${daysToAdd} Hari`,
        months: Math.round((daysToAdd / 30) * 10) / 10,
        amount: paymentDetails.amount || 0,
        paymentMethod: paymentDetails.method || 'superadmin_override',
        referenceNumber: paymentDetails.referenceNumber || null,
        paidAt: new Date().toISOString(),
        expiresAt: newExpiry.toISOString(),
        notes: paymentDetails.notes || `Penambahan masa aktif +${daysToAdd} hari oleh Admin`,
    };

    const updatedHistory = [historyEntry, ...(Array.isArray(store.subscriptionHistory) ? store.subscriptionHistory : [])];

    const newStatus = store.subscriptionStatus === 'suspended' ? 'suspended' : 'active';

    await updateStore(storeId, {
        subscriptionPlan: store.subscriptionPlan || 'pro',
        subscriptionStatus: newStatus,
        subscriptionExpiresAt: newExpiry.toISOString(),
        subscriptionHistory: updatedHistory,
    });

    broadcastOrderChange({ storeId, action: 'subscription_updated' });

    return {
        success: true,
        newExpiry: newExpiry.toISOString(),
    };
}

/**
 * Reset masa uji coba (Free Trial)
 */
export async function resetStoreTrial(storeId, trialDays = 14) {
    if (!storeId) throw new Error('ID Toko tidak valid');
    const now = new Date();
    const newExpiry = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    await updateStore(storeId, {
        subscriptionStatus: 'trial',
        subscriptionExpiresAt: newExpiry.toISOString(),
        trialStartedAt: now.toISOString(),
    });

    broadcastOrderChange({ storeId, action: 'subscription_updated' });
    return true;
}

/**
 * Suspend toko (nonaktifkan akses)
 */
export async function suspendStore(storeId, reason = 'Pelanggaran ketentuan layanan') {
    if (!storeId) throw new Error('ID Toko tidak valid');
    await updateStore(storeId, {
        subscriptionStatus: 'suspended',
        suspendReason: reason,
    });

    broadcastOrderChange({ storeId, action: 'subscription_updated' });
    return true;
}
