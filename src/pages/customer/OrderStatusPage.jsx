import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { subscribeToOrderStatus } from '../../services/orderService';
import { getStore } from '../../services/storeService';
import { applyThemeColor } from '../../utils/themeUtils';
import { downloadReceiptPNG } from '../../utils/receiptGenerator';
import { Clock, ChefHat, CheckCircle2, Package, QrCode, Banknote, Download, MapPin } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';

const steps = [
    { key: 'pending', label: 'Menunggu', sublabel: 'Pesanan diterima', icon: Clock, color: 'text-amber-500' },
    { key: 'processing', label: 'Diproses', sublabel: 'Sedang disiapkan', icon: ChefHat, color: 'text-blue-500' },
    { key: 'completed', label: 'Selesai', sublabel: 'Siap diambil', icon: CheckCircle2, color: 'text-emerald-500' },
];

const stepIndex = { pending: 0, processing: 1, completed: 2 };

export default function OrderStatusPage() {
    const { orderId } = useParams();
    const location = useLocation();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qrisUrl, setQrisUrl] = useState(location.state?.qrisUrl || '');
    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [receiptFooter, setReceiptFooter] = useState('');
    const [logoUrl, setLogoUrl] = useState('');

    useEffect(() => {
        const unsubscribe = subscribeToOrderStatus(orderId, (data) => {
            setOrder(data);
            setLoading(false);
            // Fetch store data for QRIS and theme
            if (data.storeId) {
                getStore(data.storeId).then((store) => {
                    if (store?.qrisUrl) {
                        setQrisUrl((prev) => prev || store.qrisUrl);
                    }
                    if (store?.name) setStoreName(store.name);
                    if (store?.address) setStoreAddress(store.address);
                    if (store?.receiptFooter) setReceiptFooter(store.receiptFooter);
                    if (store?.logoUrl) setLogoUrl(store.logoUrl);
                    if (store?.themeColor) {
                        applyThemeColor(store.themeColor, store.customColor);
                    }
                });
            }
        }, (error) => {
            console.error('Order status error:', error);
            setLoading(false);
        });
        return unsubscribe;
    }, [orderId]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    if (loading) return <Spinner text="Memuat status pesanan..." />;
    if (!order) {
        return (
            <div className="text-center py-20">
                <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="font-semibold text-slate-600">Pesanan tidak ditemukan</h3>
            </div>
        );
    }

    const currentStep = stepIndex[order.status] ?? 0;

    return (
        <div className="p-4 space-y-4">
            {/* Order Status Header */}
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
                <div className="text-center">
                    {order.status === 'completed' ? (
                        <CheckCircle2 className="w-14 h-14 mx-auto mb-3 animate-bounce" />
                    ) : order.status === 'processing' ? (
                        <ChefHat className="w-14 h-14 mx-auto mb-3 animate-pulse" />
                    ) : (
                        <Clock className="w-14 h-14 mx-auto mb-3 animate-pulse" />
                    )}
                    <h1 className="text-xl font-bold mb-1">
                        {order.status === 'completed' ? 'Pesanan Siap!' :
                            order.status === 'processing' ? 'Sedang Diproses' : 'Menunggu Konfirmasi'}
                    </h1>
                    <p className="text-white/90 text-sm font-semibold">
                        {order.tableNumber
                            ? `Meja #${order.tableNumber}`
                            : order.orderType === 'delivery'
                                ? '🛵 Antar ke Rumah (Delivery)'
                                : '🛍️ Ambil di Resto (Take Away)'}
                    </p>
                    {order.customerName && (
                        <p className="text-white/80 text-xs mt-0.5">Pemesan: {order.customerName}</p>
                    )}
                </div>
            </div>

            {/* Delivery / Take Away Info Box */}
            {order.orderType === 'delivery' && order.deliveryAddress && (
                <div className="bg-white rounded-2xl border border-border p-4 shadow-sm text-xs">
                    <div className="flex items-center gap-2 mb-1 text-secondary font-bold">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>Alamat Pengantaran:</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed pl-6">{order.deliveryAddress}</p>
                    {order.customerPhone && (
                        <p className="text-slate-400 pl-6 mt-1 font-mono">No. WhatsApp: {order.customerPhone}</p>
                    )}
                </div>
            )}

            {/* QRIS Payment Section */}
            {order.paymentMethod === 'qris' && order.paymentStatus !== 'paid' && (
                <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <QrCode className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-secondary">Pembayaran QRIS</h3>
                    </div>
                    {qrisUrl ? (
                        <div className="text-center">
                            <img
                                src={qrisUrl}
                                alt="QRIS"
                                className="w-full max-w-[280px] mx-auto rounded-xl border border-border shadow-sm mb-3"
                            />
                            <p className="text-sm text-slate-500">Scan QR code di atas untuk membayar</p>
                            <p className="text-primary font-bold text-lg mt-2">{formatPrice(order.totalPrice)}</p>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-slate-400">
                            <QrCode className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">QRIS belum tersedia</p>
                            <p className="text-xs mt-1">Silakan bayar di kasir</p>
                        </div>
                    )}
                </div>
            )}

            {/* Cash Payment Info */}
            {order.paymentMethod === 'cash' && (
                <div className="bg-white rounded-2xl border-2 border-emerald-400 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-bold text-secondary">
                            {order.amountPaid ? 'Pembayaran Berhasil' : 'Bayar di Kasir'}
                        </h3>
                    </div>

                    <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Order ID</span>
                            <span className="font-mono font-bold text-secondary">{orderId?.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Meja</span>
                            <span className="font-bold text-secondary">#{order.tableNumber || '?'}</span>
                        </div>
                        <div className="border-t border-emerald-200 pt-2 space-y-1.5">
                            {order.items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-slate-700">{item.name} × {item.quantity}</span>
                                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t-2 border-emerald-300 pt-2 flex justify-between font-bold text-lg">
                            <span className="text-secondary">Total</span>
                            <span className="text-primary">{formatPrice(order.totalPrice)}</span>
                        </div>
                        {order.amountPaid && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Bayar</span>
                                    <span className="font-semibold text-secondary">{formatPrice(order.amountPaid)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Kembali</span>
                                    <span className="font-bold text-emerald-600">
                                        {formatPrice((order.amountPaid || 0) - (order.totalPrice || 0))}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {!order.amountPaid && (
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                            <p className="text-amber-800 font-semibold text-sm animate-pulse">💵 Silakan bayar di kasir</p>
                            <p className="text-amber-600 text-xs mt-1">Tunjukkan halaman ini ke kasir</p>
                        </div>
                    )}
                </div>
            )}

            {/* Progress Steps */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                <h3 className="font-bold text-secondary mb-5">Status Pesanan</h3>
                <div className="space-y-0">
                    {steps.map((step, idx) => {
                        const isActive = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        return (
                            <div key={step.key} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                    ${isActive ? `${step.color} border-current bg-current/10` : 'border-slate-200 text-slate-300 bg-slate-50'}
                    ${isCurrent ? 'ring-4 ring-current/20 scale-110' : ''}
                  `}>
                                        <step.icon className="w-5 h-5" />
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`w-0.5 h-10 ${isActive ? 'bg-primary' : 'bg-slate-200'}`} />
                                    )}
                                </div>
                                <div className={`pt-2 ${isCurrent ? 'opacity-100' : 'opacity-60'}`}>
                                    <p className={`font-semibold text-sm ${isActive ? 'text-secondary' : 'text-slate-400'}`}>{step.label}</p>
                                    {!(step.key === 'completed' && order.orderType === 'dine_in') && (
                                        <p className="text-xs text-slate-400">{step.sublabel}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                <h3 className="font-bold text-secondary mb-3">Detail Pesanan</h3>
                <div className="space-y-3">
                    {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                            <div>
                                <span className="text-slate-700">{item.name} × {item.quantity}</span>
                                {item.notes && (
                                    <p className="text-xs text-amber-600 mt-0.5">📝 {item.notes}</p>
                                )}
                            </div>
                            <span className="font-medium text-slate-600">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                    ))}
                    {order.notes && (
                        <div className="pt-2 border-t border-border">
                            <p className="text-xs text-slate-500">💬 {order.notes}</p>
                        </div>
                    )}
                    <div className="pt-3 border-t border-border flex justify-between font-bold">
                        <span className="text-secondary">Total</span>
                        <span className="text-primary text-lg">{formatPrice(order.totalPrice)}</span>
                    </div>
                </div>
            </div>

            {/* Download Receipt Button — show when payment completed or for QRIS */}
            {(order.amountPaid || order.paymentMethod === 'qris') && (
                <button
                    onClick={() => downloadReceiptPNG(order, storeName, orderId, storeAddress, receiptFooter, logoUrl)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-secondary text-white font-semibold text-sm shadow-lg hover:bg-slate-700 active:scale-[0.98] transition-all cursor-pointer"
                >
                    <Download className="w-4 h-4" />
                    Download Struk
                </button>
            )}

            <p className="text-center text-xs text-slate-400 mt-1">
                Order ID: {orderId?.slice(0, 8)}...
            </p>
        </div>
    );
}
