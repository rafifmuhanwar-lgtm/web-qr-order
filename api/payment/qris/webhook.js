import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://swzbcxyaaqcmlqwbagbz.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3emJjeHlhYXFjbWxxd2JhZ2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDkyODAsImV4cCI6MjEwNjA4NTI4MH0.hp_lz6JMmhLhWphmlqm3A3KYVrNzr_TbIMY5eSWdVdo';
const EXPECTED_SECRET = process.env.QRIS_WEBHOOK_SECRET || 'emakan_qris_secret_2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Ekstraksi angka nominal dari berbagai format teks/angka yang dikirim Payhook
 */
function parseAmount(val, text) {
    if (typeof val === 'number' && !isNaN(val) && val > 0) return Math.round(val);
    if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9]/g, '');
        if (cleaned) return parseInt(cleaned, 10);
    }
    if (typeof text === 'string') {
        // Cari pola Rp 50.123 atau 50123
        const match = text.match(/(?:rp\.?|idr)\s*([0-9.,]+)/i) || text.match(/([0-9]{2,3}(?:\.[0-9]{3})+)/);
        if (match && match[1]) {
            const num = match[1].replace(/[^0-9]/g, '');
            if (num) return parseInt(num, 10);
        }
    }
    return 0;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, X-API-KEY, authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 1. Health check & Ping via GET
    if (req.method === 'GET') {
        return res.status(200).json({
            success: true,
            status: 'online',
            service: 'Payhook Dynamic QRIS Serverless Webhook (eMakan)',
            timestamp: new Date().toISOString(),
            message: 'Webhook endpoint aktif dan siap menerima notifikasi mutasi dari Payhook Android!',
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    // 2. Autentikasi Header (x-api-key)
    const apiKey =
        req.headers['x-api-key'] ||
        req.headers['X-API-KEY'] ||
        req.query?.api_key ||
        req.body?.api_key;

    if (apiKey !== EXPECTED_SECRET && apiKey !== 'ecukur_qris_secret_2026') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Header x-api-key tidak valid atau tidak cocok',
        });
    }

    const body = req.body || {};

    // 3. Handle Ping Test dari Dashboard
    if (body.action === 'ping' || body.test === true) {
        return res.status(200).json({
            success: true,
            type: 'ping_response',
            message: 'Koneksi Payhook ke server BERHASIL! (Ping OK) 🚀',
            timestamp: new Date().toISOString(),
            authenticated: true,
        });
    }

    // 4. Ekstraksi Nominal Transfer
    const amount = parseAmount(
        body.amount || body.nominal || body.gross_amount || body.total,
        body.text || body.keterangan || body.description || body.content || body.message
    );

    if (!amount || amount <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Nominal transfer tidak ditemukan dalam payload mutasi Payhook',
            received_body: body,
        });
    }

    try {
        // 5. Cari Pesanan Pending yang Cocok di Supabase
        // Ambil 50 pesanan terbaru yang belum lunas
        const { data: pendingOrders, error: fetchErr } = await supabase
            .from('orders')
            .select('*')
            .neq('paymentStatus', 'paid')
            .order('createdAt', { ascending: false })
            .limit(50);

        if (fetchErr) {
            throw new Error('Gagal membaca data pesanan dari database: ' + fetchErr.message);
        }

        // Cari pesanan yang cocok berdasarkan:
        // A. Total harga pas (totalPrice == amount)
        // B. Atau notes menyimpan invoice nominal pas
        // C. Atau orderId langsung jika dikirim
        let matchedOrder = null;

        if (body.order_id || body.orderId) {
            const targetId = body.order_id || body.orderId;
            matchedOrder = pendingOrders.find((o) => o.id === targetId);
        }

        if (!matchedOrder) {
            // Cocokkan nominal tepat
            matchedOrder = pendingOrders.find((o) => {
                const orderPrice = Number(o.totalPrice) || 0;
                if (orderPrice === amount) return true;

                // Cek jika ada payAmount di dalam notes JSON
                if (o.notes && typeof o.notes === 'string' && o.notes.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(o.notes);
                        if (parsed.payAmount === amount || parsed.totalAmount === amount) {
                            return true;
                        }
                    } catch {
                        // ignore
                    }
                }
                return false;
            });
        }

        if (!matchedOrder) {
            return res.status(200).json({
                success: false,
                status: 'unmatched',
                amount_received: amount,
                message: `Mutasi Rp ${amount.toLocaleString('id-ID')} diterima, namun tidak ada pesanan pending yang cocok dengan nominal ini.`,
            });
        }

        // 6. Update Status Pesanan Menjadi LUNAS (PAID)
        let updatedNotes = matchedOrder.notes;
        if (typeof updatedNotes === 'string' && updatedNotes.startsWith('{')) {
            try {
                const parsed = JSON.parse(updatedNotes);
                parsed.amountPaid = amount;
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

        const { error: updateErr } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', matchedOrder.id);

        if (updateErr) {
            throw new Error('Gagal memperbarui status lunas: ' + updateErr.message);
        }

        // 7. Broadcast Real-time Event ke Semua Layar (Pelanggan & Kasir)
        try {
            const syncChannel = supabase.channel('order-sync-global');
            await syncChannel.send({
                type: 'broadcast',
                event: 'order_change',
                payload: {
                    orderId: matchedOrder.id,
                    storeId: matchedOrder.storeId,
                    paymentStatus: 'paid',
                    amountPaid: amount,
                    type: 'payhook_success',
                },
            });
        } catch {
            // non-blocking broadcast error
        }

        return res.status(200).json({
            success: true,
            status: 'verified',
            order_id: matchedOrder.id,
            customer_name: matchedOrder.customerName,
            amount_paid: amount,
            message: `Pembayaran QRIS pesanan #${matchedOrder.id.slice(0, 8)} berhasil diverifikasi ✅`,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message,
        });
    }
}
