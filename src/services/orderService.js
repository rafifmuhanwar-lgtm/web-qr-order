import { supabase } from '../config/supabase';
import { broadcastChatMessage } from './chatService';

const COLLECTION = 'orders';

export const ORDER_STATUSES = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    ON_DELIVERY: 'on_delivery',
    READY: 'ready',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Global Broadcast channel for instant cross-tab / cross-client synchronization
const orderSyncChannel = supabase.channel('order-sync-global');
orderSyncChannel.subscribe();

export const broadcastOrderChange = (payload) => {
    try {
        orderSyncChannel.send({
            type: 'broadcast',
            event: 'order_change',
            payload: payload || {},
        });
    } catch {
        // ignore broadcast send error
    }
};

export const createOrder = async (orderData) => {
    // Pack all delivery metadata inside notes to ensure 100% schema compatibility
    const deliveryMeta = {
        phone: orderData.customerPhone || null,
        address: orderData.deliveryAddress || null,
        lat: orderData.customerCoordinates?.lat || null,
        lng: orderData.customerCoordinates?.lng || null,
        distanceKm: orderData.distanceKm || 0,
        shippingFee: orderData.shippingFee || 0,
        courierTip: orderData.courierTip || 0,
        userNotes: orderData.userNotes || orderData.notes || '',
        uniqueCode: orderData.uniqueCode || 0,
        baseAmount: orderData.baseTotal || orderData.totalPrice || 0,
        payAmount: orderData.payAmount || orderData.totalPrice || 0,
        chats: [],
    };

    const corePayload = {
        storeId: orderData.storeId,
        tableId: orderData.tableId || null,
        tableNumber: orderData.tableNumber || null,
        customerName: orderData.customerName || null,
        items: orderData.items || [],
        totalPrice: orderData.totalPrice || 0,
        orderType: orderData.orderType || 'dine_in',
        paymentMethod: orderData.paymentMethod || 'qris',
        paymentStatus: orderData.paymentStatus || 'pending',
        status: orderData.status || 'pending',
        notes: JSON.stringify(deliveryMeta),
    };

    const { data: result, error } = await supabase
        .from(COLLECTION)
        .insert([corePayload])
        .select()
        .single();
    if (error) throw error;

    // Trigger instant broadcast to all listening dashboards/devices
    broadcastOrderChange({
        orderId: result.id,
        storeId: corePayload.storeId,
        type: 'new_order',
        order: result,
    });

    return result.id;
};

export const getOrdersByStore = async (storeId) => {
    if (!storeId) return [];
    const { data, error } = await supabase
        .from(COLLECTION)
        .select('*')
        .eq('storeId', storeId)
        .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const subscribeToOrders = (storeId, callback, onError) => {
    let isCancelled = false;

    const fetchOrders = async () => {
        if (isCancelled || !storeId) return;
        try {
            const { data, error } = await supabase
                .from(COLLECTION)
                .select('*')
                .eq('storeId', storeId)
                .order('createdAt', { ascending: false });

            if (error) {
                if (onError) onError(error);
            } else if (data && !isCancelled) {
                callback(data);
            }
        } catch (err) {
            if (onError) onError(err);
        }
    };

    // 1. Initial fetch
    fetchOrders();

    // 2. High-frequency smart polling (every 2.5 seconds)
    // Ensures real-time updates even if Supabase PostgreSQL CDC replication is sleeping, disconnected, or blocked
    const pollInterval = setInterval(fetchOrders, 2500);

    // 3. Tab visibility & window focus triggers immediate re-fetch
    const handleVisibilityOrFocus = () => {
        if (!document.hidden) fetchOrders();
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 4. Supabase Broadcast listener (Instant cross-tab/cross-client notifications)
    orderSyncChannel.on('broadcast', { event: 'order_change' }, (e) => {
        if (!e.payload?.storeId || e.payload.storeId === storeId) {
            fetchOrders();
        }
    });

    // 5. Supabase Postgres CDC Changes (Unique channel per subscriber to avoid channel collision)
    const channelId = `realtime_orders_${storeId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const postgresChannel = supabase.channel(channelId)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: COLLECTION,
        }, () => {
            fetchOrders();
        })
        .subscribe();

    return () => {
        isCancelled = true;
        clearInterval(pollInterval);
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        window.removeEventListener('focus', handleVisibilityOrFocus);
        supabase.removeChannel(postgresChannel);
        // Note: global broadcast channel remains open for app lifetime
    };
};

export const subscribeToOrderStatus = (orderId, callback, onError) => {
    let isCancelled = false;

    const fetchOrder = async () => {
        if (isCancelled || !orderId) return;
        try {
            const { data, error } = await supabase
                .from(COLLECTION)
                .select('*')
                .eq('id', orderId)
                .single();

            if (error) {
                if (onError) onError(error);
            } else if (data && !isCancelled) {
                callback(data);
            }
        } catch (err) {
            if (onError) onError(err);
        }
    };

    // 1. Initial fetch
    fetchOrder();

    // 2. High-frequency smart polling (every 2.5 seconds)
    const pollInterval = setInterval(fetchOrder, 2500);

    // 3. Tab visibility & window focus
    const handleVisibilityOrFocus = () => {
        if (!document.hidden) fetchOrder();
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 4. Broadcast listener
    orderSyncChannel.on('broadcast', { event: 'order_change' }, (e) => {
        if (!e.payload?.orderId || e.payload.orderId === orderId) {
            fetchOrder();
        }
    });

    // 5. Postgres Changes (Unique channel per subscriber)
    const channelId = `realtime_order_${orderId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const postgresChannel = supabase.channel(channelId)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: COLLECTION,
            filter: `id=eq.${orderId}`
        }, (payload) => {
            if (payload.new) callback(payload.new);
            else fetchOrder();
        })
        .subscribe();

    return () => {
        isCancelled = true;
        clearInterval(pollInterval);
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        window.removeEventListener('focus', handleVisibilityOrFocus);
        supabase.removeChannel(postgresChannel);
    };
};

export const updateOrderStatus = async (orderId, status) => {
    const { error } = await supabase
        .from(COLLECTION)
        .update({ status })
        .eq('id', orderId);
    if (error) throw error;

    broadcastOrderChange({ orderId, status });
};

export const sendOrderChatMessage = async (orderId, currentNotes, message) => {
    // 1. Fetch latest notes from DB to guarantee real-time consistency
    const { data: latestOrder } = await supabase
        .from(COLLECTION)
        .select('notes')
        .eq('id', orderId)
        .single();

    const notesSource = latestOrder?.notes || currentNotes;
    let parsedNotes = {};
    try {
        parsedNotes = typeof notesSource === 'string' && notesSource.startsWith('{')
            ? JSON.parse(notesSource)
            : { userNotes: notesSource || '' };
    } catch {
        parsedNotes = { userNotes: notesSource || '' };
    }

    const chats = Array.isArray(parsedNotes.chats) ? parsedNotes.chats : [];
    chats.push({
        id: Date.now().toString(),
        sender: message.sender, // 'customer' | 'resto'
        senderName: message.senderName || (message.sender === 'resto' ? 'Pihak Resto' : 'Pelanggan'),
        text: message.text,
        timestamp: new Date().toISOString(),
    });

    parsedNotes.chats = chats;

    const { error } = await supabase
        .from(COLLECTION)
        .update({ notes: JSON.stringify(parsedNotes) })
        .eq('id', orderId);

    if (error) throw error;

    broadcastChatMessage({ orderId, newChat: chats[chats.length - 1], chats });
    broadcastOrderChange({ orderId, chatUpdated: true });

    return chats;
};

export const updateOrderPayment = async (orderId, paymentData) => {
    const { error } = await supabase
        .from(COLLECTION)
        .update({ ...paymentData, paymentStatus: 'paid' })
        .eq('id', orderId);
    if (error) throw error;

    broadcastOrderChange({ orderId, paymentStatus: 'paid' });
};

export const exportOrdersToCSV = (orders) => {
    const headers = ['Order ID', 'Meja', 'Items', 'Total', 'Status', 'Tanggal'];
    const rows = orders.map((order) => [
        order.id,
        order.tableNumber ? `Meja #${order.tableNumber}` : 'Online',
        order.items?.map((i) => `${i.name} x${i.quantity}`).join('; ') || '-',
        order.totalPrice || 0,
        order.status,
        new Date(order.createdAt).toLocaleDateString('id-ID') || '-',
    ]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-pesanan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

