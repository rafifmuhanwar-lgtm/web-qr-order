import { supabase } from '../config/supabase';

const PAYHOOK_STORAGE_KEY = 'emakan_payhook_config';

export const DEFAULT_PAYHOOK_CONFIG = {
    merchantName: 'BAYAR QRIS bypipx, Ahli Chiropractic',
    address: 'PERUM GRIYA SETU PERMAI BLOK D.5NO.20',
    nmid: 'ID1026490305079',
    qrisImageUrl: '/payhook-qris.jpg',
    useUniqueCode: true,
    webhookSecret: 'ph_sec_' + Math.random().toString(36).substring(2, 12),
};

export function getPayhookConfig() {
    try {
        const saved = localStorage.getItem(PAYHOOK_STORAGE_KEY);
        if (saved) return { ...DEFAULT_PAYHOOK_CONFIG, ...JSON.parse(saved) };
    } catch {
        // fallback
    }
    return DEFAULT_PAYHOOK_CONFIG;
}

export function savePayhookConfig(newConfig) {
    localStorage.setItem(PAYHOOK_STORAGE_KEY, JSON.stringify(newConfig));
}

/**
 * Generate unique payment nominal (e.g. Total Rp 35.000 -> Rp 35.027)
 * Memudahkan bot mutasi Payhook membaca transfer unik
 */
export function generatePayhookInvoice(baseAmount, orderId) {
    const config = getPayhookConfig();
    let uniqueCode = 0;
    if (config.useUniqueCode) {
        // Deterministic unique 2-digit number based on order ID or time
        const hash = (orderId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        uniqueCode = (hash % 89) + 11; // 11 to 99
    }

    const payAmount = Number(baseAmount) + uniqueCode;
    return {
        orderId,
        baseAmount,
        uniqueCode,
        payAmount,
        merchantName: config.merchantName,
        nmid: config.nmid,
        address: config.address,
        qrisImageUrl: config.qrisImageUrl,
    };
}

/**
 * Konfirmasi pembayaran Payhook (bisa dipanggil dari webhook callback atau Master Admin)
 */
export async function confirmPayhookPayment(orderId, amountPaid) {
    const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (fetchErr || !order) throw new Error('Pesanan tidak ditemukan');

    const { error } = await supabase
        .from('orders')
        .update({
            paymentStatus: 'paid',
            paymentMethod: 'qris',
            amountPaid: amountPaid || order.totalPrice,
        })
        .eq('id', orderId);

    if (error) throw error;
    return true;
}

