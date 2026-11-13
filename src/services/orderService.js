import { supabase } from '../config/supabase';

const COLLECTION = 'orders';

export const ORDER_STATUSES = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    ON_DELIVERY: 'on_delivery',
    READY: 'ready',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
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
    return result.id;
};

export const subscribeToOrders = (storeId, callback, onError) => {
    // Initial fetch
    supabase.from(COLLECTION)
        .select('*')
        .eq('storeId', storeId)
        .order('createdAt', { ascending: false })
        .then(({ data, error }) => {
            if (error && onError) return onError(error);
            if (data) callback(data);
        });

    // Realtime channel
    const channel = supabase.channel(`public:${COLLECTION}:storeId=eq.${storeId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: COLLECTION,
            filter: `storeId=eq.${storeId}`
        }, () => {
            // Re-fetch on any change for simplicity in sorting
            supabase.from(COLLECTION)
                .select('*')
                .eq('storeId', storeId)
                .order('createdAt', { ascending: false })
                .then(({ data }) => {
                    if (data) callback(data);
                });
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const subscribeToOrderStatus = (orderId, callback, onError) => {
    supabase.from(COLLECTION)
        .select('*')
        .eq('id', orderId)
        .single()
        .then(({ data, error }) => {
            if (error && onError) return onError(error);
            if (data) callback(data);
        });

    const channel = supabase.channel(`public:${COLLECTION}:id=eq.${orderId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: COLLECTION,
            filter: `id=eq.${orderId}`
        }, (payload) => {
            callback(payload.new);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const updateOrderStatus = async (orderId, status) => {
    const { error } = await supabase
        .from(COLLECTION)
        .update({ status })
        .eq('id', orderId);
    if (error) throw error;
};

export const sendOrderChatMessage = async (orderId, currentNotes, message) => {
    let parsedNotes = {};
    try {
        parsedNotes = typeof currentNotes === 'string' && currentNotes.startsWith('{')
            ? JSON.parse(currentNotes)
            : { userNotes: currentNotes || '' };
    } catch {
        parsedNotes = { userNotes: currentNotes || '' };
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
    return chats;
};

export const updateOrderPayment = async (orderId, paymentData) => {
    const { error } = await supabase
        .from(COLLECTION)
        .update({ ...paymentData, paymentStatus: 'paid' })
        .eq('id', orderId);
    if (error) throw error;
};

export const getOrdersByDateRange = async (storeId, startDate, endDate) => {
    const { data, error } = await supabase
        .from(COLLECTION)
        .select('*')
        .eq('storeId', storeId)
        .gte('createdAt', `${startDate}T00:00:00`)
        .lte('createdAt', `${endDate}T23:59:59`)
        .order('createdAt', { ascending: false });
    if (error) throw error;
    return data;
};

export const exportOrdersToCSV = (orders) => {
    const headers = ['Order ID', 'Meja', 'Items', 'Total', 'Status', 'Tanggal'];
    const rows = orders.map((order) => [
        order.id,
        order.tableNumber || '-',
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

export const getOrdersByMonth = async (storeId, year, month) => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
        .from(COLLECTION)
        .select('*')
        .eq('storeId', storeId)
        .gte('createdAt', start)
        .lte('createdAt', end)
        .order('createdAt', { ascending: false });
    if (error) throw error;
    return data;
};
