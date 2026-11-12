import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToOrders, updateOrderStatus, updateOrderPayment } from '../../services/orderService';
import { downloadReceiptPNG } from '../../utils/receiptGenerator';
import { ClipboardList, Clock, ChefHat, CheckCircle2, ArrowRight, X, Banknote, Calculator, Receipt, Download } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const tabs = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Menunggu' },
    { key: 'processing', label: 'Diproses' },
    { key: 'completed', label: 'Selesai' },
];

const nextStatus = { pending: 'processing', processing: 'completed' };
const nextLabel = { pending: 'Proses', processing: 'Selesai' };

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
        }, (error) => {
            console.error('Orders error:', error);
            setLoading(false);
        });
        return unsubscribe;
    }, [storeId]);

    const filteredOrders = activeTab === 'all'
        ? orders
        : orders.filter((o) => o.status === activeTab);

    const handleUpdateStatus = async (order) => {
        const currentStatus = order.status;
        const newStatus = nextStatus[currentStatus];
        if (!newStatus) return;

        // If completing a cash order that hasn't been paid, show payment modal
        if (newStatus === 'completed' && order.paymentMethod === 'cash' && !order.amountPaid) {
            setCashModal(order);
            setAmountPaid('');
            return;
        }

        try {
            await updateOrderStatus(order.id, newStatus);
            toast.success(`Status diubah ke ${nextLabel[currentStatus]}`);
        } catch {
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

    const pendingCount = orders.filter((o) => o.status === 'pending').length;

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

    if (loading) return <Spinner />;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-secondary">Pesanan</h1>
                    <p className="text-slate-500 text-sm">
                        {pendingCount > 0 ? `${pendingCount} pesanan menunggu` : 'Semua pesanan terproses'}
                    </p>
                </div>
                {pendingCount > 0 && (
                    <div className="relative">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute -top-1 -right-1" />
                        <div className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full">{pendingCount}</div>
                    </div>
                )}
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                    const count = tab.key === 'all' ? orders.length : orders.filter((o) => o.status === tab.key).length;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer
                ${activeTab === tab.key
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-white text-slate-600 border border-border hover:border-primary/30'
                                }`}
                        >
                            {tab.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Tidak ada pesanan" description={`Belum ada pesanan ${activeTab !== 'all' ? `dengan status ${activeTab}` : ''}`} />
            ) : (
                <div className="space-y-3">
                    {filteredOrders.map((order) => (
                        <div key={order.id} onClick={() => setDetailOrder(order)} className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow animate-fade-in cursor-pointer">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${order.status === 'pending' ? 'bg-amber-100' : order.status === 'processing' ? 'bg-blue-100' : 'bg-emerald-100'}`}
                                    >
                                        {order.status === 'pending' ? <Clock className="w-5 h-5 text-amber-600" /> :
                                            order.status === 'processing' ? <ChefHat className="w-5 h-5 text-blue-600" /> :
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-secondary">
                                                {order.tableNumber ? `Meja #${order.tableNumber}` : (order.customerName || 'Online')}
                                            </h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                order.orderType === 'delivery'
                                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                    : order.orderType === 'take_away' && !order.tableNumber
                                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                        : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {order.orderType === 'delivery' ? '🛵 Delivery' : order.orderType === 'take_away' ? '🛍️ Take Away' : '🍽️ Dine In'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400">{formatTime(order.createdAt)}</p>
                                    </div>
                                </div>
                                <Badge status={order.status} />
                            </div>

                            {/* Items */}
                            <div className="space-y-1.5 mb-3 bg-slate-50 rounded-xl p-3">
                                {order.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-slate-600">
                                            {item.name} × {item.quantity}
                                            {item.notes && <span className="text-amber-600 ml-1 text-xs">({item.notes})</span>}
                                        </span>
                                        <span className="font-medium text-slate-700">{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                                {order.notes && (
                                    <p className="text-xs text-slate-500 pt-1 border-t border-border mt-1">💬 {order.notes}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-primary text-lg">{formatPrice(order.totalPrice)}</span>
                                    {order.paymentMethod && (
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium
                                            ${order.paymentMethod === 'qris'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {order.paymentMethod === 'qris' ? '📱 QRIS' : '💵 Kasir'}
                                        </span>
                                    )}
                                    {order.amountPaid && (
                                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-700">
                                            ✅ Lunas
                                        </span>
                                    )}
                                </div>
                                {order.status !== 'completed' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order); }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all
                      ${order.status === 'pending'
                                                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                            }`}
                                    >
                                        {nextLabel[order.status]}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
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
                                                ? '🛵 Pesanan Delivery'
                                                : '🛍️ Pesanan Take Away'}
                                    </h4>
                                    <p className="text-xs text-slate-400">{formatTime(detailOrder.createdAt)}</p>
                                </div>
                                <Badge status={detailOrder.status} />
                            </div>

                            {/* Receipt-style Items */}
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
                                            <p className="text-[10px] text-amber-600 mt-0.5 ml-1">📝 {item.notes}</p>
                                        )}
                                    </div>
                                ))}
                                {detailOrder.notes && (
                                    <p className="text-xs text-slate-500 pt-2 border-t border-border">💬 {detailOrder.notes}</p>
                                )}

                                <div className="border-t-2 border-border pt-2 mt-2">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span className="text-secondary">Total</span>
                                        <span className="text-primary">{formatPrice(detailOrder.totalPrice)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                {detailOrder.orderType && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Tipe Pesanan</span>
                                        <span className="font-semibold text-secondary">
                                            {detailOrder.orderType === 'dine_in'
                                                ? '🍽️ Dine In (Makan di Meja)'
                                                : detailOrder.orderType === 'delivery'
                                                    ? '🛵 Delivery (Kirim ke Rumah)'
                                                    : '🛍️ Take Away (Ambil Sendiri)'}
                                        </span>
                                    </div>
                                )}
                                {detailOrder.customerName && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Nama Pemesan</span>
                                        <span className="font-semibold text-secondary">{detailOrder.customerName}</span>
                                    </div>
                                )}
                                {detailOrder.customerPhone && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Kontak WhatsApp</span>
                                        <a
                                            href={`https://wa.me/${detailOrder.customerPhone.replace(/\D/g, '')}?text=Halo%20${encodeURIComponent(detailOrder.customerName || '')},%20mengenai%20pesanan%20eMakan%20Anda...`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-bold text-emerald-600 hover:underline flex items-center gap-1"
                                        >
                                            <span>💬 Hubungi WA</span>
                                        </a>
                                    </div>
                                )}
                                {detailOrder.deliveryAddress && (
                                    <div className="text-xs pt-2 border-t border-border mt-1">
                                        <span className="text-slate-500 font-semibold block mb-1">📍 Alamat Pengantaran:</span>
                                        <p className="font-medium text-slate-700 bg-white p-2.5 rounded-xl border border-border leading-relaxed">
                                            {detailOrder.deliveryAddress}
                                        </p>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Pembayaran</span>
                                    <span className="font-semibold text-secondary">
                                        {detailOrder.paymentMethod === 'qris' ? '📱 QRIS' : detailOrder.paymentMethod === 'cash' ? '💵 Tunai' : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Status</span>
                                    <span className={`font-semibold ${detailOrder.amountPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {detailOrder.amountPaid ? '✅ Lunas' : '⏳ Belum bayar'}
                                    </span>
                                </div>
                                {detailOrder.amountPaid && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Bayar</span>
                                            <span className="font-medium text-secondary">{formatPrice(detailOrder.amountPaid)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Kembali</span>
                                            <span className="font-bold text-emerald-600">
                                                {formatPrice((detailOrder.amountPaid || 0) - (detailOrder.totalPrice || 0))}
                                            </span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Order ID</span>
                                    <span className="font-mono text-xs text-slate-600">#{detailOrder.id?.slice(0, 8).toUpperCase()}</span>
                                </div>
                            </div>

                            {/* QRIS Confirm Payment */}
                            {detailOrder.paymentMethod === 'qris' && !detailOrder.amountPaid && (
                                <button
                                    onClick={async () => {
                                        try {
                                            await updateOrderPayment(detailOrder.id, {
                                                amountPaid: detailOrder.totalPrice,
                                                changeAmount: 0,
                                            });
                                            toast.success('QRIS dikonfirmasi lunas!');
                                            setDetailOrder(null);
                                        } catch {
                                            toast.error('Gagal konfirmasi pembayaran');
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Konfirmasi QRIS Lunas
                                </button>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        downloadReceiptPNG(detailOrder, storeData?.name || '', detailOrder.id, storeData?.address || '', storeData?.receiptFooter || '', storeData?.logoUrl || '');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-all cursor-pointer"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Struk
                                </button>
                                {detailOrder.status !== 'completed' && (
                                    <button
                                        onClick={() => { setDetailOrder(null); handleUpdateStatus(detailOrder); }}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all cursor-pointer
                                            ${detailOrder.status === 'pending'
                                                ? 'bg-blue-500 hover:bg-blue-600'
                                                : 'bg-emerald-500 hover:bg-emerald-600'
                                            }`}
                                    >
                                        {nextLabel[detailOrder.status]}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
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
                            <p className="text-sm text-slate-500">Meja #{cashModal.tableNumber || '?'}</p>
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
