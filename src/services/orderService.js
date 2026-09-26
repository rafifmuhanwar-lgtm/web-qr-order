import {
    collection,
    query,
    where,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    orderBy,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'orders';

export const createOrder = async (orderData) => {
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...orderData,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
};

export const subscribeToOrders = (storeId, callback, onError) => {
    const q = query(
        collection(db, COLLECTION),
        where('storeId', '==', storeId)
    );
    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        callback(orders);
    }, (error) => {
        console.error('Order subscription error:', error);
        if (onError) onError(error);
    });
};

export const subscribeToOrderStatus = (orderId, callback, onError) => {
    const docRef = doc(db, COLLECTION, orderId);
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() });
        }
    }, (error) => {
        console.error('Order status subscription error:', error);
        if (onError) onError(error);
    });
};

export const updateOrderStatus = async (orderId, status) => {
    const docRef = doc(db, COLLECTION, orderId);
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
};

export const updateOrderPayment = async (orderId, paymentData) => {
    const docRef = doc(db, COLLECTION, orderId);
    await updateDoc(docRef, {
        ...paymentData,
        paymentStatus: 'paid',
        updatedAt: serverTimestamp(),
    });
};

export const getOrdersByDateRange = async (storeId, startDate, endDate) => {
    const start = Timestamp.fromDate(new Date(startDate + 'T00:00:00'));
    const end = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));

    const q = query(
        collection(db, COLLECTION),
        where('storeId', '==', storeId),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const exportOrdersToCSV = (orders) => {
    const headers = ['Order ID', 'Meja', 'Items', 'Total', 'Status', 'Tanggal'];
    const rows = orders.map((order) => [
        order.id,
        order.tableNumber || '-',
        order.items?.map((i) => `${i.name} x${i.quantity}`).join('; ') || '-',
        order.totalPrice || 0,
        order.status,
        order.createdAt?.toDate?.()?.toLocaleDateString('id-ID') || '-',
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
    const start = Timestamp.fromDate(new Date(year, month, 1));
    const end = Timestamp.fromDate(new Date(year, month + 1, 0, 23, 59, 59));

    const q = query(
        collection(db, COLLECTION),
        where('storeId', '==', storeId),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

