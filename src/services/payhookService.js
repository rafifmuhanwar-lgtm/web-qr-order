import { supabase } from '../config/supabase';
import {
    generateDynamicQris,
    MASTER_QRIS_STATIC,
    MASTER_MERCHANT_INFO,
    generateUniqueAmount,
} from '../utils/qrisUtils';

const PAYHOOK_STORAGE_KEY = 'emakan_payhook_config';

export const DEFAULT_PAYHOOK_CONFIG = {
    merchantName: MASTER_MERCHANT_INFO.name,
    address: MASTER_MERCHANT_INFO.address,
    nmid: MASTER_MERCHANT_INFO.nmid,
    provider: MASTER_MERCHANT_INFO.provider,
    rawStaticQris: MASTER_QRIS_STATIC,
    qrisImageUrl: '/payhook-qris.jpg',
    useUniqueCode: true,
    useDynamicQris: true,
    secretKey: 'emakan_qris_secret_2026',
    webhookPath: '/api/payment/qris/webhook',
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
 * Generate Tagihan QRIS Dinamis + 3 Digit Kode Unik
 * Nominal langsung terkunci otomatis saat di-scan pelanggan
 */
export function generatePayhookInvoice(baseAmount, orderId) {
    const config = getPayhookConfig();
    let uniqueCode = 0;
    let payAmount = Number(baseAmount) || 0;

    if (config.useUniqueCode) {
        const result = generateUniqueAmount(baseAmount, orderId);
        uniqueCode = result.uniqueCode;
        payAmount = result.totalAmount;
    }

    // Generate EMVCo dynamic QRIS payload dengan Tag 54 + CRC16
    let dynamicQrisPayload = '';
    if (config.useDynamicQris) {
        dynamicQrisPayload = generateDynamicQris(config.rawStaticQris, payAmount);
    }

    return {
        orderId,
        baseAmount: Number(baseAmount),
        uniqueCode,
        payAmount,
        merchantName: config.merchantName,
        nmid: config.nmid,
        address: config.address,
        provider: config.provider,
        qrisImageUrl: config.qrisImageUrl,
        dynamicQrisPayload,
        isDynamicLocked: Boolean(dynamicQrisPayload),
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

    let updatedNotes = order.notes;
    if (typeof updatedNotes === 'string' && updatedNotes.startsWith('{')) {
        try {
            const parsed = JSON.parse(updatedNotes);
            parsed.amountPaid = amountPaid || order.totalPrice;
            parsed.paidAt = new Date().toISOString();
            parsed.payhookVerified = true;
            updatedNotes = JSON.stringify(parsed);
        } catch {
            // ignore
        }
    }

    const updatePayload = {
        paymentStatus: 'paid',
        paymentMethod: 'qris',
    };
    if (updatedNotes) {
        updatePayload.notes = updatedNotes;
    }

    const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

    if (error) throw error;

    // Trigger instant broadcast ke seluruh UI
    try {
        const syncChannel = supabase.channel('order-sync-global');
        await syncChannel.send({
            type: 'broadcast',
            event: 'order_change',
            payload: { orderId, paymentStatus: 'paid', type: 'manual_verification' },
        });
    } catch {
        // ignore
    }

    return true;
}

/**
 * Uji Ping Koneksi ke Endpoint Serverless Webhook
 */
export async function pingPayhookWebhook(secretKey) {
    const config = getPayhookConfig();
    const key = secretKey || config.secretKey;
    const url = `${window.location.origin}${config.webhookPath}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
        },
        body: JSON.stringify({ action: 'ping', test: true }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}: Gagal ping webhook`);
    }
    return data;
}

/**
 * Simulasi Notifikasi Mutasi Masuk dari HP Android (misal Rp 50.123)
 */
export async function simulatePayhookNotification(amount = 50123, secretKey) {
    const config = getPayhookConfig();
    const key = secretKey || config.secretKey;
    const url = `${window.location.origin}${config.webhookPath}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
        },
        body: JSON.stringify({
            amount: Number(amount),
            nominal: Number(amount),
            bank: 'GOPAY_SIMULATION',
            text: `Dana Masuk Rp ${Number(amount).toLocaleString('id-ID')} dari GO-PAY MERCHANT`,
            description: 'Simulasi Payhook Mutasi Test',
        }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}: Simulasi gagal`);
    }
    return data;
}
