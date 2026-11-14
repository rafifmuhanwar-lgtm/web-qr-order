import { supabase } from '../config/supabase';

// 6 Jam dalam Milidetik (6 * 60 * 60 * 1000)
export const CHAT_TTL_MS = 6 * 60 * 60 * 1000;

// Dedicated real-time broadcast channel for instant chat message sync
export const chatSyncChannel = supabase.channel('chat-sync-global');
chatSyncChannel.subscribe();

export function broadcastChatMessage(payload) {
    try {
        chatSyncChannel.send({
            type: 'broadcast',
            event: 'new_chat_message',
            payload: payload || {},
        });
    } catch {
        // non-blocking
    }
}

/**
 * Cek apakah sebuah pesan sudah melewati batas usia 6 jam
 */
export function isChatExpired(timestamp) {
    if (!timestamp) return false;
    const time = new Date(timestamp).getTime();
    if (isNaN(time)) return false;
    return Date.now() - time > CHAT_TTL_MS;
}

/**
 * Membersihkan pesan chat kadaluarsa (> 6 jam) dari database Supabase
 */
export async function purgeExpiredChats(storeId) {
    if (!storeId) return;

    const sixHoursAgoIso = new Date(Date.now() - CHAT_TTL_MS).toISOString();

    try {
        // 1. Hapus thread chat mandiri (customer_chat / inquiry) yang dibuat > 6 jam lalu
        await supabase
            .from('orders')
            .delete()
            .eq('storeId', storeId)
            .in('orderType', ['customer_chat', 'inquiry'])
            .lt('createdAt', sixHoursAgoIso);

        // 2. Bersihkan riwayat chat di dalam pesanan aktif jika ada chat yang > 6 jam
        const { data: ordersWithChats } = await supabase
            .from('orders')
            .select('id, notes')
            .eq('storeId', storeId)
            .ilike('notes', '%"chats":[%');

        if (Array.isArray(ordersWithChats)) {
            for (const order of ordersWithChats) {
                if (!order.notes || !order.notes.startsWith('{')) continue;
                try {
                    const parsed = JSON.parse(order.notes);
                    if (Array.isArray(parsed.chats) && parsed.chats.length > 0) {
                        const validChats = parsed.chats.filter(
                            (c) => !isChatExpired(c.timestamp)
                        );
                        if (validChats.length !== parsed.chats.length) {
                            parsed.chats = validChats;
                            await supabase
                                .from('orders')
                                .update({ notes: JSON.stringify(parsed) })
                                .eq('id', order.id);
                        }
                    }
                } catch {
                    // ignore json parse error
                }
            }
        }
    } catch (err) {
        console.error('Error purging expired chats:', err);
    }
}

/**
 * Mengambil semua sesi obrolan aktif toko (< 6 jam) dari Supabase
 */
export async function getActiveStoreChats(storeId) {
    if (!storeId) return [];

    // Trigger pembersihan chat kadaluarsa secara non-blocking
    purgeExpiredChats(storeId).catch(() => {});

    const sixHoursAgoIso = new Date(Date.now() - CHAT_TTL_MS).toISOString();

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('storeId', storeId)
        .gte('createdAt', sixHoursAgoIso)
        .or('orderType.in.(customer_chat,inquiry),notes.ilike.%"chats":[%')
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Failed to get store chats:', error);
        return [];
    }

    // Filter pesan yang belum 6 jam
    const activeThreads = [];

    for (const item of data || []) {
        let chats = [];
        let parsedNotes = {};
        if (item.notes && item.notes.startsWith('{')) {
            try {
                parsedNotes = JSON.parse(item.notes);
                chats = Array.isArray(parsedNotes.chats)
                    ? parsedNotes.chats.filter((c) => !isChatExpired(c.timestamp))
                    : [];
            } catch {
                chats = [];
            }
        }

        if (chats.length > 0 || item.orderType === 'customer_chat') {
            activeThreads.push({
                ...item,
                chats,
                latestChat: chats[chats.length - 1] || null,
            });
        }
    }

    return activeThreads;
}

/**
 * Kirim pesan chat baru dan simpan permanen ke Supabase database
 */
export async function sendChatMessage(orderId, currentNotes, message) {
    // 1. Ambil notes termutakhir dari database
    const { data: latestOrder } = await supabase
        .from('orders')
        .select('notes')
        .eq('id', orderId)
        .single();

    const notesSource = latestOrder?.notes || currentNotes;
    let parsedNotes = {};
    try {
        parsedNotes =
            typeof notesSource === 'string' && notesSource.startsWith('{')
                ? JSON.parse(notesSource)
                : { userNotes: notesSource || '' };
    } catch {
        parsedNotes = { userNotes: notesSource || '' };
    }

    const chats = Array.isArray(parsedNotes.chats)
        ? parsedNotes.chats.filter((c) => !isChatExpired(c.timestamp))
        : [];

    const newChat = {
        id: Date.now().toString(),
        sender: message.sender, // 'customer' | 'resto'
        senderName: message.senderName || (message.sender === 'resto' ? 'Pihak Resto' : 'Pelanggan'),
        text: message.text,
        timestamp: new Date().toISOString(),
    };
    chats.push(newChat);

    parsedNotes.chats = chats;

    const { error } = await supabase
        .from('orders')
        .update({ notes: JSON.stringify(parsedNotes) })
        .eq('id', orderId);

    if (error) throw error;

    // Broadcast instant WebSocket update across both global channels
    broadcastChatMessage({ orderId, newChat, chats });

    try {
        const syncChannel = supabase.channel('order-sync-global');
        await syncChannel.send({
            type: 'broadcast',
            event: 'order_change',
            payload: { orderId, chatUpdated: true, newChat },
        });
    } catch {
        // non-blocking
    }

    return chats;
}
