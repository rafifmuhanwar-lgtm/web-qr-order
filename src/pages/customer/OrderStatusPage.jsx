import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { subscribeToOrderStatus } from '../../services/orderService';
import { getStore } from '../../services/storeService';
import { applyThemeColor } from '../../utils/themeUtils';
import { downloadReceiptPNG } from '../../utils/receiptGenerator';
import { parseOrderDelivery, parseStoreConfig, buildGoogleMapsRouteUrl } from '../../utils/deliveryUtils';
import { getPayhookConfig } from '../../services/payhookService';
import { generateDynamicQris, MASTER_QRIS_STATIC } from '../../utils/qrisUtils';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, ChefHat, CheckCircle2, Package, QrCode, Banknote, Download, MapPin, Bike, ShoppingBag, Phone, Navigation, Copy, RefreshCw } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

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

            if (data?.customerName && data.customerName !== 'Pelanggan') {
                sessionStorage.setItem('emakan_customer_name', data.customerName);
                localStorage.setItem('emakan_customer_name', data.customerName);
            }
            if (data?.storeId) {
                sessionStorage.setItem(`emakan_active_order_${data.storeId}`, orderId);
            }

            if (data?.storeId) {
                getStore(data.storeId).then((store) => {
                    if (store?.qrisUrl) {
                        setQrisUrl((prev) => prev || store.qrisUrl);
                    }
                    if (store?.name) setStoreName(store.name);
                    if (store?.receiptFooter) setReceiptFooter(store.receiptFooter);
                    if (store?.logoUrl) setLogoUrl(store.logoUrl);
                    if (store?.themeColor) {
                        applyThemeColor(store.themeColor, store.customColor);
                    }
                    const cfg = parseStoreConfig(store);
                    setStoreAddress(cfg.address || '');
                });
            }
        }, (error) => {
            console.error('Order status error:', error);
            setLoading(false);
        });
        return unsubscribe;
    }, [orderId]);

    const delivery = useMemo(() => parseOrderDelivery(order), [order]);

    const dynamicQris = useMemo(() => {
        if (!order?.totalPrice) return '';
        const rawStatic = getPayhookConfig().rawStaticQris || MASTER_QRIS_STATIC;
        return generateDynamicQris(rawStatic, order.totalPrice);
    }, [order]);

    // 4-Step Dynamic Flow
    const steps = useMemo(() => {
        const isDelivery = order?.orderType === 'delivery';
        const isTakeAway = order?.orderType === 'take_away';

        return [
            {
                key: 'pending',
                label: 'Pesanan Masuk',
                sublabel: 'Menunggu konfirmasi resto',
                icon: Clock,
                color: 'text-amber-500',
            },
            {
                key: 'processing',
                label: 'Sedang Dibuat',
                sublabel: 'Dapur sedang memasak makanan',
                icon: ChefHat,
                color: 'text-blue-500',
            },
            {
                key: isDelivery ? 'on_delivery' : 'ready',
                label: isDelivery ? 'Sedang Diantar' : isTakeAway ? 'Siap Diambil' : 'Siap Disajikan',
                sublabel: isDelivery ? 'Kurir meluncur ke rumahmu' : 'Bisa diambil di kasir',
                icon: isDelivery ? Bike : ShoppingBag,
                color: 'text-orange-500',
            },
            {
                key: 'completed',
                label: 'Pesanan Selesai',
                sublabel: 'Pesanan tiba & telah diterima',
                icon: CheckCircle2,
                color: 'text-emerald-500',
            },
        ];
    }, [order?.orderType]);

    const stepIndex = useMemo(() => {
        const isDelivery = order?.orderType === 'delivery';
        const thirdKey = isDelivery ? 'on_delivery' : 'ready';
        return {
            pending: 0,
            processing: 1,
            [thirdKey]: 2,
            ready: 2,
            on_delivery: 2,
            completed: 3,
        };
    }, [order?.orderType]);

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
            {order.orderType === 'delivery' && (delivery.address || order.deliveryAddress) && (
                <div className="bg-white rounded-2xl border border-border p-4 shadow-sm text-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-secondary font-bold">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>Alamat Pengantaran:</span>
                        </div>
                        {delivery.distanceKm > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                Jarak: {delivery.distanceKm} km
                            </span>
                        )}
                    </div>
                    <p className="text-slate-600 leading-relaxed pl-5 font-medium">{delivery.address || order.deliveryAddress}</p>
                    {delivery.phone && (
                        <p className="text-slate-500 pl-5 font-mono">No. Kontak: {delivery.phone}</p>
                    )}

                    {delivery.lat && delivery.lng && (
                        <div className="pt-1 pl-5">
                            <a
                                href={buildGoogleMapsRouteUrl(delivery.lat, delivery.lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors"
                            >
                                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                                <span>Buka Titik di Google Maps</span>
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Payhook QRIS Payment Section */}
            {order.paymentMethod === 'qris' && order.paymentStatus !== 'paid' && (
                <div className="bg-white rounded-3xl border border-border p-5 shadow-sm text-center animate-fade-in space-y-4">
                    {/* Payhook Merchant Header */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                        <h4 className="font-bold text-xs text-secondary tracking-wide uppercase">
                            {getPayhookConfig().merchantName}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{getPayhookConfig().address}</p>
                        <p className="text-[10px] font-mono font-semibold text-primary mt-1">
                            NMID: {getPayhookConfig().nmid}
                        </p>
                    </div>

                    {/* Dynamic QR Code Container */}
                    <div className="relative inline-block mx-auto p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                        {dynamicQris ? (
                            <QRCodeSVG
                                value={dynamicQris}
                                size={220}
                                level="M"
                                includeMargin={true}
                                className="mx-auto rounded-lg"
                            />
                        ) : (
                            <img
                                src={qrisUrl || getPayhookConfig().qrisImageUrl}
                                alt="QRIS Payhook"
                                className="w-full max-w-[240px] mx-auto rounded-xl object-contain"
                            />
                        )}
                        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 py-1 px-3 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            QRIS Dinamis • Nominal Terkunci Otomatis
                        </div>
                    </div>

                    {/* Nominal Box */}
                    <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[11px] font-medium text-orange-800">Total yang Harus Dibayar:</span>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-2xl font-black text-orange-600 font-mono tracking-tight">
                                {formatPrice(order.totalPrice)}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(String(order.totalPrice));
                                    toast.success('Nominal disalin!');
                                }}
                                className="p-1 text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
                                title="Salin Nominal"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[10px] text-orange-700/80">
                            Transfer persis sesuai nominal agar pembayaran terdeteksi otomatis oleh sistem Payhook.
                        </p>
                    </div>

                    {/* Instructions */}
                    <div className="text-[11px] text-slate-400 space-y-1">
                        <p>Dapat dibayar dengan GoPay, OVO, ShopeePay, DANA, BCA, Livin, atau m-Banking apapun.</p>
                    </div>

                    {/* Status Check Button */}
                    <button
                        type="button"
                        onClick={() => {
                            toast.loading('Memeriksa mutasi pembayaran...', { id: 'check_pay' });
                            setTimeout(() => {
                                toast.dismiss('check_pay');
                                if (order.paymentStatus === 'paid') {
                                    toast.success('Pembayaran telah lunas!');
                                } else {
                                    toast('Menunggu verifikasi pembayaran...', { icon: '⏳' });
                                }
                            }, 800);
                        }}
                        className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-primary" />
                        <span>Cek Status Pembayaran</span>
                    </button>
                </div>
            )}

            {order.paymentMethod === 'qris' && order.paymentStatus === 'paid' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-800 animate-fade-in space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-sm">Pembayaran QRIS Berhasil!</h4>
                    <p className="text-xs text-emerald-700">Terima kasih, pembayaran Anda telah diterima sistem Payhook.</p>
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
                        {order.tableNumber ? (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Meja</span>
                                <span className="font-bold text-secondary">#{order.tableNumber}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Tipe Pesanan</span>
                                <span className="font-bold text-secondary">
                                    {order.orderType === 'delivery' ? '🛵 Online (Delivery)' : '🛍️ Online (Take Away)'}
                                </span>
                            </div>
                        )}
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

                    {/* Breakdown Ongkir & Tip */}
                    {order.orderType === 'delivery' && (
                        <div className="pt-2 border-t border-border space-y-1.5 text-xs text-slate-500">
                            <div className="flex justify-between">
                                <span>Ongkos Kirim ({delivery.distanceKm > 0 ? `${delivery.distanceKm} km` : 'Pengantaran'})</span>
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
                        <div className="pt-2 border-t border-border">
                            <p className="text-xs text-slate-500">📝 Catatan: {delivery.userNotes}</p>
                        </div>
                    )}
                    <div className="pt-3 border-t border-border flex justify-between font-bold">
                        <span className="text-secondary">Total Tagihan</span>
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
