import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToOrders, updateOrderStatus, updateOrderPayment } from '../../services/orderService';
import { downloadReceiptPNG } from '../../utils/receiptGenerator';
import { parseOrderDelivery, buildGoogleMapsRouteUrl } from '../../utils/deliveryUtils';
import {
    ClipboardList,
    Clock,
    ChefHat,
    CheckCircle2,
    ArrowRight,
    X,
    Banknote,
    Receipt,
    Download,
    Bike,
    ShoppingBag,
    MapPin,
    Navigation,
    Phone,
    MessageCircle,
    MessageSquare,
    HeartHandshake,
    RefreshCw,
    Calculator,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const tabs = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Pesanan Masuk' },
    { key: 'processing', label: 'Sedang Dimasak' },
    { key: 'in_transit', label: 'Diantar / Siap' },
    { key: 'completed', label: 'Selesai' },
];

export default function OrderPage() {
    const { storeId, storeData } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');

    // Detail modal state
    const [detailOrder, setDetailOrder] = useState(null);

    // Cash payment modal state
    const [cashModal, setCashModal] = useState(null);
    const [amountPaid, setAmountPaid] = useState('');
    const [savingPayment, setSavingPayment] = useState(false);

    useEffect(() => {
        if (!storeId) return;
        const unsubscribe = subscribeToOrders(storeId, (data) => {
            setOrders(data);
            setLoading(false);
            // Auto update detailOrder if open
            setDetailOrder((prev) => {
                if (!prev) return null;
                const found = data.find((o) => o.id === prev.id);
                return found || prev;
            });
        }, (error) => {
            console.error('Orders error:', error);
            setLoading(false);
        });
        return unsubscribe;
    }, [storeId]);

    const foodOrders = useMemo(() => {
        return orders.filter((o) => o.orderType !== 'customer_chat' && o.orderType !== 'inquiry');
    }, [orders]);

    const filteredOrders = useMemo(() => {
        if (activeTab === 'all') return foodOrders;
        if (activeTab === 'in_transit') {
            return foodOrders.filter((o) => o.status === 'on_delivery' || o.status === 'ready');
        }
        return foodOrders.filter((o) => o.status === activeTab);
    }, [foodOrders, activeTab]);

    const getNextStatusAction = (order) => {
        const status = order.status;
        const type = order.orderType;

        if (status === 'pending') {
            return { next: 'processing', label: 'Mulai Masak', color: 'bg-blue-600 hover:bg-blue-700' };
        }
        if (status === 'processing') {
            if (type === 'delivery') {
                return { next: 'on_delivery', label: 'Kirim Kurir', color: 'bg-orange-500 hover:bg-orange-600' };
            }
            if (type === 'take_away') {
                return { next: 'ready', label: 'Siap Diambil', color: 'bg-indigo-600 hover:bg-indigo-700' };
            }
            return { next: 'completed', label: 'Selesaikan Pesanan', color: 'bg-emerald-600 hover:bg-emerald-700' };
        }
        if (status === 'on_delivery' || status === 'ready') {
            return { next: 'completed', label: 'Selesai & Diterima', color: 'bg-emerald-600 hover:bg-emerald-700' };
        }
        return null;
    };

    const handleUpdateStatus = async (order) => {
        const action = getNextStatusAction(order);
        if (!action) return;

        // If completing a cash order that hasn't been paid, show payment modal
        if (action.next === 'completed' && order.paymentMethod === 'cash' && !order.amountPaid) {
            setCashModal(order);
            setAmountPaid('');
            return;
        }

        // Optimistic UI update: Instantly reflect status change in memory
        const prevOrders = [...orders];
        setOrders((prev) =>
            prev.map((o) => (o.id === order.id ? { ...o, status: action.next } : o))
        );
        if (detailOrder?.id === order.id) {
            setDetailOrder((prev) => ({ ...prev, status: action.next }));
        }

        try {
            await updateOrderStatus(order.id, action.next);
            toast.success(`Status berhasil diubah ke: ${action.label}`);
        } catch {
            // Rollback on failure
            setOrders(prevOrders);
            if (detailOrder?.id === order.id) {
                setDetailOrder(order);
            }
            toast.error('Gagal mengubah status');
        }
    };

    const handleSaveCashPayment = async () => {
        if (!cashModal) return;
        const paid = parseInt(amountPaid) || 0;
        if (paid < cashModal.totalPrice) {
            toast.error('Jumlah bayar kurang dari total');
            return;
        }

        const prevOrders = [...orders];
        // Optimistic UI update for payment & completion
        setOrders((prev) =>
            prev.map((o) =>
                o.id === cashModal.id
                    ? {
                          ...o,
                          status: 'completed',
                          paymentStatus: 'paid',
                          amountPaid: paid,
                          changeAmount: paid - cashModal.totalPrice,
                      }
                    : o
            )
        );
        if (detailOrder?.id === cashModal.id) {
            setDetailOrder((prev) => ({
                ...prev,
                status: 'completed',
                paymentStatus: 'paid',
                amountPaid: paid,
                changeAmount: paid - cashModal.totalPrice,
            }));
        }

        setSavingPayment(true);
        try {
            // Save payment and complete order
            await updateOrderPayment(cashModal.id, {
                amountPaid: paid,
                changeAmount: paid - cashModal.totalPrice,
            });
            await updateOrderStatus(cashModal.id, 'completed');
            toast.success('Pembayaran berhasil! Struk tersedia untuk customer.');
            setCashModal(null);
        } catch {
            setOrders(prevOrders);
            toast.error('Gagal menyimpan pembayaran');
        } finally {
            setSavingPayment(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    const parseDate = (ts) => {
        if (!ts) return null;
        if (typeof ts?.toDate === 'function') return ts.toDate();
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
    };

    const formatTime = (timestamp) => {
        const d = parseDate(timestamp);
        if (!d) return '-';
        return d.toLocaleString('id-ID', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
        });
    };

    const pendingCount = foodOrders.filter((o) => o.status === 'pending').length;

    // Cash modal computed
    const changeAmount = useMemo(() => {
        if (!cashModal) return 0;
        const paid = parseInt(amountPaid) || 0;
        return paid - cashModal.totalPrice;
    }, [amountPaid, cashModal]);

    // Quick amount suggestions
    const suggestedAmounts = useMemo(() => {
        if (!cashModal) return [];
        const total = cashModal.totalPrice;
        const suggestions = new Set();
        suggestions.add(total);
        // Round up to nearest 5k, 10k, 20k, 50k, 100k
        [5000, 10000, 20000, 50000, 100000].forEach((step) => {
            const rounded = Math.ceil(total / step) * step;
            if (rounded >= total && rounded <= total * 3) suggestions.add(rounded);
        });
        return [...suggestions].sort((a, b) => a - b).slice(0, 5);
    }, [cashModal]);

    const [manualRefreshing, setManualRefreshing] = useState(false);

    if (loading) return <Spinner />;

    return (
        <div className="space-y-5">
            {/* Clean Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pesanan</h1>
                    <p className="text-xs text-slate-500">
                        {pendingCount > 0 ? `${pendingCount} pesanan menunggu proses` : 'Semua pesanan terproses'}
                    </p>
                </div>

                <button
                    onClick={() => {
                        setManualRefreshing(true);
                        setTimeout(() => setManualRefreshing(false), 500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    title="Segarkan data pesanan"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${manualRefreshing ? 'animate-spin text-slate-900' : ''}`} />
                    <span>Perbarui</span>
                </button>
            </div>

            {/* Clean Status Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => {
                    const count = tab.key === 'all'
                        ? foodOrders.length
                        : tab.key === 'in_transit'
                            ? foodOrders.filter((o) => o.status === 'on_delivery' || o.status === 'ready').length
                            : foodOrders.filter((o) => o.status === tab.key).length;
                    const isActive = activeTab === tab.key;

                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                                isActive
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Orders Cards Grid */}
            {filteredOrders.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    title="Tidak ada pesanan"
                    description={`Belum ada pesanan ${activeTab !== 'all' ? `dengan status ${activeTab}` : ''}`}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredOrders.map((order) => {
                        const delivery = parseOrderDelivery(order);
                        const action = getNextStatusAction(order);
                        const hasItems = Array.isArray(order.items) && order.items.length > 0;

                        return (
                            <div
                                key={order.id}
                                className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                            >
                                {/* Ticket Header */}
                                <div className="p-4 pb-3 border-b border-slate-100 flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900 text-base">
                                                {order.tableNumber ? `Meja #${order.tableNumber}` : (order.customerName || 'Online')}
                                            </h3>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                                order.orderType === 'delivery'
                                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                    : order.orderType === 'take_away' && !order.tableNumber
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                                {order.orderType === 'delivery' ? 'Delivery' : order.orderType === 'take_away' ? 'Take Away' : 'Dine In'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                                            <span>#{order.id.slice(0, 6)}</span>
                                            <span>•</span>
                                            <span className="font-sans">{formatTime(order.createdAt)}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {delivery.chats && delivery.chats.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDetailOrder(order);
                                                }}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
                                                title="Klik untuk membuka obrolan langsung"
                                            >
                                                <MessageSquare className="w-3 h-3 text-orange-500" />
                                                <span>{delivery.chats.length} Pesan</span>
                                            </button>
                                        )}
                                        <Badge status={order.status} />
                                    </div>
                                </div>

                                {/* Ticket Body */}
                                <div className="p-4 flex-1 space-y-3">
                                    {/* Delivery Address & Maps Link */}
                                    {order.orderType === 'delivery' && (delivery.address || order.deliveryAddress) && (
                                        <div className="bg-purple-50/70 border border-purple-100 rounded-lg p-2.5 text-xs text-purple-900">
                                            <div className="flex items-start justify-between gap-1.5">
                                                <p className="font-medium flex items-center gap-1 truncate">
                                                    <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                    <span className="truncate">{delivery.address || order.deliveryAddress}</span>
                                                </p>
                                                {delivery.lat && delivery.lng && (
                                                    <a
                                                        href={buildGoogleMapsRouteUrl(delivery.lat, delivery.lng)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="px-2 py-0.5 bg-white text-purple-700 font-bold text-[10px] rounded border border-purple-200 shrink-0 hover:bg-purple-100 transition-colors flex items-center gap-1"
                                                    >
                                                        <Navigation className="w-2.5 h-2.5" />
                                                        Maps
                                                    </a>
                                                )}
                                            </div>
                                            {delivery.distanceKm > 0 && (
                                                <p className="text-[10px] text-purple-600 pl-4 mt-0.5">
                                                    {delivery.distanceKm} km · Ongkir: {delivery.shippingFee > 0 ? formatPrice(delivery.shippingFee) : 'Gratis'}
                                                    {delivery.courierTip > 0 && ` · Tip: ${formatPrice(delivery.courierTip)}`}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Items List */}
                                    {hasItems ? (
                                        <div className="space-y-1.5 text-xs text-slate-700">
                                            {order.items.slice(0, 4).map((item, idx) => (
                                                <div key={idx} className="flex justify-between py-0.5">
                                                    <span className="truncate pr-2">
                                                        <span className="font-bold text-slate-900">{item.quantity}x</span> {item.name}
                                                        {item.notes && <span className="text-amber-600 text-[11px] block">"{item.notes}"</span>}
                                                    </span>
                                                    <span className="font-medium text-slate-600 shrink-0">
                                                        {formatPrice(item.price * item.quantity)}
                                                    </span>
                                                </div>
                                            ))}
                                            {order.items.length > 4 && (
                                                <p className="text-[11px] text-slate-400 italic pt-0.5">
                                                    +{order.items.length - 4} menu lainnya...
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic py-1">Tidak ada rincian item terlampir</p>
                                    )}

                                    {delivery.userNotes && (
                                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            {delivery.userNotes}
                                        </p>
                                    )}
                                </div>

                                {/* Ticket Footer */}
                                <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Tagihan</span>
                                        <span className="font-bold text-slate-900 text-sm">
                                            {formatPrice(order.totalPrice)}
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-slate-500">
                                                {order.paymentMethod === 'qris' ? 'QRIS' : 'Tunai'}
                                            </span>
                                            <span className="text-[10px] text-slate-300">•</span>
                                            <span className={`text-[10px] font-bold ${order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {order.paymentStatus === 'paid' ? 'Lunas' : 'Belum Bayar'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setDetailOrder(order)}
                                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        >
                                            Detail
                                        </button>
                                        {action && (
                                            <button
                                                onClick={() => handleUpdateStatus(order)}
                                                className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer ${action.color}`}
                                            >
                                                <span>{action.label}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Order Detail Modal */}
            {detailOrder && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setDetailOrder(null)} />
                    <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3 border-b border-border rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-primary" />
                                    <h3 className="font-bold text-lg text-secondary">Detail Pesanan</h3>
                                </div>
                                <button onClick={() => setDetailOrder(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Order Info */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-secondary text-lg">
                                        {detailOrder.tableNumber
                                            ? `Meja #${detailOrder.tableNumber}`
                                            : detailOrder.orderType === 'delivery'
                                                ? 'Pesanan Delivery'
                                                : 'Pesanan Take Away'}
                                    </h4>
                                    <p className="text-xs text-slate-400">{formatTime(detailOrder.createdAt)}</p>
                                </div>
                                <Badge status={detailOrder.status} />
                            </div>

                            {/* Receipt-style Items */}
                            {(() => {
                                const delivery = parseOrderDelivery(detailOrder);
                                const action = getNextStatusAction(detailOrder);

                                return (
                                    <>
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                            <div className="flex justify-between text-xs font-semibold text-slate-400 pb-1 border-b border-border">
                                                <span>Item</span>
                                                <span>Harga</span>
                                            </div>
                                            {detailOrder.items?.map((item, idx) => (
                                                <div key={idx}>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-700">{item.name} × {item.quantity}</span>
                                                        <span className="font-medium text-slate-700">{formatPrice(item.price * item.quantity)}</span>
                                                    </div>
                                                    {item.notes && (
                                                        <p className="text-[10px] text-amber-600 mt-0.5 ml-1">{item.notes}</p>
                                                    )}
                                                </div>
                                            ))}

                                            {detailOrder.orderType === 'delivery' && (
                                                <div className="pt-2 border-t border-border space-y-1 text-xs text-slate-500">
                                                    <div className="flex justify-between">
                                                        <span>Ongkir ({delivery.distanceKm > 0 ? `${delivery.distanceKm} km` : 'Pengantaran'})</span>
                                                        <span className={delivery.shippingFee > 0 ? 'font-medium text-slate-700' : 'font-bold text-emerald-600'}>
                                                            {delivery.shippingFee > 0 ? formatPrice(delivery.shippingFee) : 'GRATIS'}
                                                        </span>
                                                    </div>
                                                    {delivery.courierTip > 0 && (
                                                        <div className="flex justify-between">
                                                            <span>Tip untuk Kurir</span>
                                                            <span className="font-medium text-primary">{formatPrice(delivery.courierTip)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {delivery.userNotes && (
                                                <p className="text-xs text-slate-500 pt-2 border-t border-border">Catatan: {delivery.userNotes}</p>
                                            )}

                                            <div className="border-t-2 border-border pt-2 mt-2">
                                                <div className="flex justify-between font-bold text-lg">
                                                    <span className="text-secondary">Total Tagihan</span>
                                                    <span className="text-primary">{formatPrice(detailOrder.totalPrice)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment & Delivery Info */}
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                            {detailOrder.orderType && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Tipe Pesanan</span>
                                                    <span className="font-semibold text-secondary">
                                                        {detailOrder.orderType === 'dine_in'
                                                            ? 'Dine In (Makan di Meja)'
                                                            : detailOrder.orderType === 'delivery'
                                                                ? 'Delivery (Kirim ke Rumah)'
                                                                : 'Take Away (Ambil Sendiri)'}
                                                    </span>
                                                </div>
                                            )}
                                            {detailOrder.customerName && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Nama Pemesan</span>
                                                    <span className="font-semibold text-secondary">{detailOrder.customerName}</span>
                                                </div>
                                            )}
                                            {(delivery.phone || detailOrder.customerPhone) && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500">No. Telepon Pelanggan</span>
                                                    <a
                                                        href={`tel:${delivery.phone || detailOrder.customerPhone}`}
                                                        className="font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>{delivery.phone || detailOrder.customerPhone}</span>
                                                    </a>
                                                </div>
                                            )}

                                            {/* Delivery Address & Google Maps Navigation */}
                                            {detailOrder.orderType === 'delivery' && (delivery.address || detailOrder.deliveryAddress) && (
                                                <div className="text-xs pt-2 border-t border-border mt-1">
                                                    <span className="text-slate-500 font-semibold block mb-1">Alamat Pengantaran:</span>
                                                    <p className="font-medium text-slate-700 bg-white p-2.5 rounded-xl border border-border leading-relaxed">
                                                        {delivery.address || detailOrder.deliveryAddress}
                                                    </p>

                                                    {delivery.lat && delivery.lng && (
                                                        <a
                                                            href={buildGoogleMapsRouteUrl(delivery.lat, delivery.lng)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md mt-2 transition-all cursor-pointer"
                                                        >
                                                            <Navigation className="w-4 h-4" />
                                                            <span>Buka Navigasi Rute di Google Maps</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Pembayaran</span>
                                                <span className="font-semibold text-secondary">
                                                    {detailOrder.paymentMethod === 'qris' ? 'QRIS' : detailOrder.paymentMethod === 'cash' ? 'Tunai' : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Status Bayar</span>
                                                <span className={`font-semibold ${detailOrder.amountPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {detailOrder.amountPaid ? 'Lunas' : 'Belum bayar'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Order ID</span>
                                                <span className="font-mono text-xs text-slate-600">#{detailOrder.id?.slice(0, 8).toUpperCase()}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => {
                                                    downloadReceiptPNG(detailOrder, storeData?.name || '', detailOrder.id, storeData?.address || '', storeData?.receiptFooter || '', storeData?.logoUrl || '');
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-all cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download Struk
                                            </button>
                                            {action && (
                                                <button
                                                    onClick={() => { setDetailOrder(null); handleUpdateStatus(detailOrder); }}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white transition-all cursor-pointer shadow-md ${action.color}`}
                                                >
                                                    <span>{action.label}</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Payment Modal */}
            {cashModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setCashModal(null)} />
                    <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-border">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-emerald-600" />
                                    <h3 className="font-bold text-lg text-secondary">Pembayaran Tunai</h3>
                                </div>
                                <button onClick={() => setCashModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-500">
                                {cashModal.tableNumber ? `Meja #${cashModal.tableNumber}` : `Order #${cashModal.id.slice(0, 6)} (Online)`}
                            </p>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Order Summary */}
                            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                                {cashModal.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-slate-600">{item.name} × {item.quantity}</span>
                                        <span className="text-slate-700 font-medium">{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-border pt-2 flex justify-between font-bold">
                                    <span className="text-secondary">Total</span>
                                    <span className="text-primary text-lg">{formatPrice(cashModal.totalPrice)}</span>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-semibold text-secondary mb-2">
                                    <Calculator className="w-4 h-4 inline mr-1" />
                                    Jumlah Bayar
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                                    <input
                                        type="number"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        placeholder="0"
                                        autoFocus
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-border text-lg font-bold text-secondary
                                            focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            {/* Quick Amounts */}
                            <div className="flex flex-wrap gap-2">
                                {suggestedAmounts.map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setAmountPaid(String(amount))}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer
                                            ${parseInt(amountPaid) === amount
                                                ? 'bg-primary text-white shadow-md'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {formatPrice(amount)}
                                    </button>
                                ))}
                            </div>

                            {/* Change Preview */}
                            {amountPaid && (
                                <div className={`rounded-xl p-4 text-center ${changeAmount >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                                    <p className="text-xs text-slate-500 mb-1">Kembalian</p>
                                    <p className={`text-2xl font-bold ${changeAmount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {changeAmount >= 0 ? formatPrice(changeAmount) : `Kurang ${formatPrice(Math.abs(changeAmount))}`}
                                    </p>
                                </div>
                            )}

                            {/* Save Button */}
                            <Button
                                onClick={handleSaveCashPayment}
                                loading={savingPayment}
                                disabled={!amountPaid || changeAmount < 0}
                                className="w-full"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Selesaikan & Kirim Struk
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
