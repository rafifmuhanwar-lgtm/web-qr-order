import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { createOrder } from '../../services/orderService';
import { getStore } from '../../services/storeService';
import { parseStoreConfig, calculateDistanceKm, calculateShippingFee } from '../../utils/deliveryUtils';
import { validateCustomerName } from '../../utils/nameValidator';
import { getPayhookConfig } from '../../services/payhookService';
import { generateDynamicQris, generateUniqueAmount, MASTER_QRIS_STATIC } from '../../utils/qrisUtils';
import { playNotificationSound } from '../../utils/soundUtils';
import { QRCodeSVG } from 'qrcode.react';
import {
    ArrowLeft,
    Minus,
    Plus,
    Trash2,
    ChefHat,
    QrCode,
    UtensilsCrossed,
    ShoppingBag,
    Bike,
    MapPin,
    User,
    CheckCircle2,
    HeartHandshake,
    AlertCircle,
    Sparkles,
    Copy,
    X,
    ShieldCheck,
    RefreshCw,
    StickyNote,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import MapPicker from '../../components/ui/MapPicker';
import toast from 'react-hot-toast';

export default function CartPage() {
    const { storeId, tableId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isOnlineOrder = !tableId;

    const [cart, setCart] = useState(() => {
        if (location.state?.cart) return location.state.cart;
        const saved = sessionStorage.getItem(`cart_${storeId}_${tableId || 'online'}`);
        return saved ? JSON.parse(saved) : [];
    });

    const [submitting, setSubmitting] = useState(false);
    const [customerName, setCustomerName] = useState(() => {
        const saved = sessionStorage.getItem('emakan_customer_name') || localStorage.getItem('emakan_customer_name') || '';
        if (saved.startsWith('Tamu Meja') || saved.startsWith('Meja #')) return '';
        return saved;
    });
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [orderType, setOrderType] = useState(isOnlineOrder ? 'take_away' : 'dine_in');

    // QRIS Flow & Real-time Auto-Detection State
    const [showQrisModal, setShowQrisModal] = useState(false);
    const [pendingOrderPayload, setPendingOrderPayload] = useState(null);
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [manualChecking, setManualChecking] = useState(false);
    const [qrisPayload, setQrisPayload] = useState('');

    // Delivery & Coordinates State
    const [storeConfig, setStoreConfig] = useState(null);
    const [customerCoords, setCustomerCoords] = useState(null);
    const [courierTip, setCourierTip] = useState(0);
    const [customTipActive, setCustomTipActive] = useState(false);
    const [customTipInput, setCustomTipInput] = useState('');

    useEffect(() => {
        if (storeId) {
            getStore(storeId).then((store) => {
                if (store) {
                    const cfg = parseStoreConfig(store);
                    setStoreConfig(cfg);
                }
            });
        }
    }, [storeId]);

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [cart]);

    // Calculate Distance & Shipping Fee
    const distanceKm = useMemo(() => {
        if (orderType !== 'delivery' || !customerCoords || !storeConfig?.lat || !storeConfig?.lng) {
            return 0;
        }
        return calculateDistanceKm(
            storeConfig.lat,
            storeConfig.lng,
            customerCoords.lat,
            customerCoords.lng
        );
    }, [orderType, customerCoords, storeConfig]);

    const shippingCalculation = useMemo(() => {
        if (orderType !== 'delivery') return { allowed: true, fee: 0, isFree: true, message: '' };
        if (!customerCoords) {
            return {
                allowed: true,
                fee: 0,
                isFree: false,
                message: 'Tentukan titik lokasi di peta untuk hitung ongkir',
            };
        }
        return calculateShippingFee(distanceKm, storeConfig);
    }, [orderType, customerCoords, distanceKm, storeConfig]);

    const finalTotal = useMemo(() => {
        const shipping = orderType === 'delivery' ? (shippingCalculation.fee || 0) : 0;
        const tip = orderType === 'delivery' ? (Number(courierTip) || 0) : 0;
        return cartTotal + shipping + tip;
    }, [cartTotal, orderType, shippingCalculation.fee, courierTip]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const handleLocationSelect = useCallback(({ lat, lng, address }) => {
        setCustomerCoords({ lat, lng });
        if (!deliveryAddress || deliveryAddress.length < 5) {
            setDeliveryAddress(address);
        }
    }, [deliveryAddress]);

    const updateQuantity = (id, delta) => {
        setCart((prev) => {
            const updated = prev
                .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
                .filter((i) => i.quantity > 0);
            sessionStorage.setItem(`cart_${storeId}_${tableId || 'online'}`, JSON.stringify(updated));
            return updated;
        });
    };

    const removeItem = (id) => {
        setCart((prev) => {
            const updated = prev.filter((i) => i.id !== id);
            sessionStorage.setItem(`cart_${storeId}_${tableId || 'online'}`, JSON.stringify(updated));
            return updated;
        });
    };

    const handleSubmit = async () => {
        if (cart.length === 0) {
            toast.error('Keranjang masih kosong');
            return;
        }

        let sanitizedName = '';
        if (isOnlineOrder) {
            const check = validateCustomerName(customerName);
            if (!check.valid) {
                toast.error(check.message);
                return;
            }
            sanitizedName = check.sanitizedName;

            if (orderType === 'delivery') {
                if (!deliveryAddress.trim()) {
                    toast.error('Mohon isi alamat pengiriman lengkap');
                    return;
                }
                if (!customerCoords) {
                    toast.error('Mohon tentukan titik lokasi rumah pada peta');
                    return;
                }
                if (!shippingCalculation.allowed) {
                    toast.error(shippingCalculation.message || 'Alamat di luar jangkauan pengantaran');
                    return;
                }
            }
        } else {
            if (customerName.trim()) {
                const check = validateCustomerName(customerName);
                if (check.valid) {
                    sanitizedName = check.sanitizedName;
                } else {
                    // Fallback otomatis ke Meja jika nama tidak valid
                    sanitizedName = `Tamu Meja #${String(tableId).padStart(3, '0')}`;
                }
            } else {
                sanitizedName = `Tamu Meja #${String(tableId).padStart(3, '0')}`;
            }
            if (!orderType) {
                toast.error('Pilih tipe pesanan (Dine In / Take Away)');
                return;
            }
        }

        const finalOrderType = isOnlineOrder ? orderType : (orderType || 'dine_in');

        if (sanitizedName) {
            sessionStorage.setItem('emakan_customer_name', sanitizedName);
            localStorage.setItem('emakan_customer_name', sanitizedName);
        }

        // 1. Generate Kode Unik 3 Digit untuk Payhook
        const payhookCfg = getPayhookConfig();
        let uniqueCode = 0;
        let payAmount = finalTotal;

        if (payhookCfg?.useUniqueCode !== false) {
            const uniqueInfo = generateUniqueAmount(finalTotal, `${storeId}_${tableId || 'online'}_${Date.now()}`);
            uniqueCode = uniqueInfo.uniqueCode;
            payAmount = uniqueInfo.totalAmount;
        }

        const orderData = {
            storeId,
            tableId: tableId || null,
            tableNumber: tableId ? String(tableId).padStart(3, '0') : null,
            customerName: sanitizedName || (tableId ? `Tamu Meja #${String(tableId).padStart(3, '0')}` : 'Pelanggan Online'),
            customerPhone: null,
            deliveryAddress: finalOrderType === 'delivery' ? deliveryAddress.trim() : null,
            shippingFee: finalOrderType === 'delivery' ? (shippingCalculation.fee || 0) : 0,
            courierTip: finalOrderType === 'delivery' ? (Number(courierTip) || 0) : 0,
            distanceKm: finalOrderType === 'delivery' ? distanceKm : 0,
            customerCoordinates: finalOrderType === 'delivery' ? customerCoords : null,
            items: cart.map((item) => ({
                menuId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                notes: item.notes || '',
            })),
            baseTotal: finalTotal,
            uniqueCode: uniqueCode,
            payAmount: payAmount, // Nominal transfer QRIS (termasuk kode unik untuk mutasi bank)
            totalPrice: finalTotal, // Nominal asli pesanan untuk pembukuan resto
            notes: cart.map(i => i.notes ? `${i.name}: ${i.notes}` : '').filter(Boolean).join(' | '),
            userNotes: cart.map(i => i.notes ? `${i.name}: ${i.notes}` : '').filter(Boolean).join(' | '),
            orderType: finalOrderType,
            paymentMethod: 'qris',
            paymentStatus: 'unpaid', // Masuk sebagai belum lunas agar webhook bisa mencocokkan mutasi
            status: 'waiting_payment', // Draft menunggu pembayaran, tidak masuk antrean masak dapur
        };

        // 2. Prepare Dynamic QRIS Code dengan nominal terkunci otomatis (termasuk kode unik)
        const rawStatic = payhookCfg?.rawStaticQris || MASTER_QRIS_STATIC;
        const dynamicCode = generateDynamicQris(rawStatic, payAmount);

        setQrisPayload(dynamicCode);
        setPaymentSuccess(false);
        setSubmitting(true);

        try {
            // Save waiting_payment order into database so Payhook webhook can match it!
            const orderId = await createOrder(orderData);
            setActiveOrderId(orderId);
            setPendingOrderPayload({ ...orderData, id: orderId });
            setShowQrisModal(true);
        } catch (err) {
            console.error('Error initiating QRIS checkout:', err);
            toast.error('Gagal menyiapkan pembayaran QRIS. Silakan coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    // Automatic Trigger when payment arrives from Payhook webhook
    const triggerPaymentSuccess = useCallback((matchedId) => {
        const orderId = matchedId || activeOrderId;
        if (!orderId || paymentSuccess) return;

        setPaymentSuccess(true);
        playNotificationSound();

        // Clear active cart from memory and session
        setCart([]);
        sessionStorage.removeItem(`cart_${storeId}_${tableId || 'online'}`);
        if (storeId) {
            sessionStorage.setItem(`emakan_active_order_${storeId}`, orderId);
        }

        toast.success('Pembayaran QRIS Berhasil! Pesanan diteruskan ke dapur.');

        // Auto navigate to order status page after showing success animation
        setTimeout(() => {
            setShowQrisModal(false);
            navigate(`/order-status/${orderId}`);
        }, 1500);
    }, [activeOrderId, paymentSuccess, storeId, tableId, navigate]);

    // Real-time automatic listener for QRIS payment
    useEffect(() => {
        if (!activeOrderId || !showQrisModal || paymentSuccess) return;

        let isMounted = true;

        // 1. Supabase Broadcast Sync
        const broadcastChannel = supabase.channel(`order-sync-${activeOrderId}`);
        broadcastChannel
            .on('broadcast', { event: 'order_change' }, (e) => {
                const payload = e.payload || {};
                if (payload.orderId === activeOrderId && payload.paymentStatus === 'paid') {
                    if (isMounted) triggerPaymentSuccess(payload.orderId);
                }
            })
            .subscribe();

        // 2. Supabase Postgres Realtime CDC on orders table
        const postgresChannel = supabase
            .channel(`order-postgres-${activeOrderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${activeOrderId}`,
                },
                (payload) => {
                    if (payload.new && payload.new.paymentStatus === 'paid') {
                        if (isMounted) triggerPaymentSuccess(payload.new.id);
                    }
                }
            )
            .subscribe();

        // 3. Polling Fallback (every 1.5s) to guarantee instant detection even if websocket reconnects
        const pollTimer = setInterval(async () => {
            try {
                const { data } = await supabase
                    .from('orders')
                    .select('id, paymentStatus, status')
                    .eq('id', activeOrderId)
                    .single();

                if (data && data.paymentStatus === 'paid') {
                    if (isMounted) triggerPaymentSuccess(data.id);
                }
            } catch {
                // ignore polling error
            }
        }, 1500);

        return () => {
            isMounted = false;
            clearInterval(pollTimer);
            supabase.removeChannel(broadcastChannel);
            supabase.removeChannel(postgresChannel);
        };
    }, [activeOrderId, showQrisModal, paymentSuccess, triggerPaymentSuccess]);

    // Manual check fallback button if Payhook notification is slightly delayed
    const handleManualCheckPayment = async () => {
        if (!activeOrderId || manualChecking || paymentSuccess) return;
        setManualChecking(true);
        const toastId = toast.loading('Memeriksa status pembayaran...');
        try {
            const { data } = await supabase
                .from('orders')
                .select('id, paymentStatus')
                .eq('id', activeOrderId)
                .single();

            if (data?.paymentStatus === 'paid') {
                toast.success('Pembayaran QRIS lunas!', { id: toastId });
                triggerPaymentSuccess(data.id);
            } else {
                toast('Pembayaran belum terdeteksi. Pastikan transfer sudah berhasil di aplikasi m-Banking/e-Wallet Anda.', {
                    id: toastId,
                    icon: '⏳',
                });
            }
        } catch {
            toast.error('Gagal mengecek status pembayaran', { id: toastId });
        } finally {
            setManualChecking(false);
        }
    };

    // Close or Cancel Order
    const handleCancelOrder = async () => {
        if (paymentSuccess) return;
        const targetId = activeOrderId;
        setShowQrisModal(false);
        setActiveOrderId(null);
        setPendingOrderPayload(null);
        if (targetId) {
            try {
                await supabase.from('orders').update({ status: 'cancelled' }).eq('id', targetId);
            } catch {
                // ignore
            }
        }
    };

    const backUrl = tableId ? `/order/${storeId}/${tableId}` : `/order/${storeId}`;

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="bg-white border-b border-border p-4 flex items-center gap-3 sticky top-0 z-20">
                <button
                    onClick={() => navigate(backUrl)}
                    className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="font-bold text-secondary text-base">Keranjang Pesanan</h1>
                    <p className="text-xs text-slate-400">
                        {isOnlineOrder ? 'Pesan Online' : `Meja #${String(tableId).padStart(3, '0')}`} · {cart.length} item
                    </p>
                </div>
            </div>

            {cart.length === 0 ? (
                <div className="text-center py-20 px-4">
                    <ChefHat className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="font-semibold text-slate-600 mb-2">Keranjang belanja kosong</h3>
                    <p className="text-sm text-slate-400 mb-5">Silakan pilih makanan dan minuman favoritmu!</p>
                    <Button onClick={() => navigate(backUrl)}>
                        Kembali ke Menu
                    </Button>
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    {/* Cart Items List */}
                    <div className="space-y-3">
                        {cart.map((item) => (
                            <div key={item.id} className="bg-white rounded-2xl border border-border p-4 shadow-xs">
                                <div className="flex gap-3">
                                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ChefHat className="w-6 h-6 text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm text-secondary truncate">{item.name}</h3>
                                        <p className="text-primary font-bold text-sm mt-0.5">{formatPrice(item.price)}</p>
                                        {item.notes && (
                                            <div className="mt-1">
                                                <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-flex items-center gap-1 font-medium max-w-full">
                                                    <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />
                                                    <span className="truncate">{item.notes}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-danger cursor-pointer self-start p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer text-slate-600"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <span className="font-bold text-secondary text-sm">{formatPrice(item.price * item.quantity)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mode Pesanan: Online vs Meja */}
                    {isOnlineOrder ? (
                        /* Section Khusus Pesanan Online / Dari Rumah */
                        <div className="bg-white rounded-2xl border border-border p-4 shadow-xs space-y-4">
                            <h3 className="font-bold text-secondary text-sm flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-primary" />
                                <span>Pilihan Pengiriman Online</span>
                            </h3>

                            {/* Pilihan: Ambil Sendiri vs Antar ke Rumah */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setOrderType('take_away')}
                                    className={`p-3.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                                        orderType === 'take_away'
                                            ? 'border-primary bg-primary/5 shadow-xs'
                                            : 'border-border hover:border-slate-300'
                                    }`}
                                >
                                    <ShoppingBag className={`w-6 h-6 mx-auto mb-1.5 ${orderType === 'take_away' ? 'text-primary' : 'text-slate-400'}`} />
                                    <p className={`text-xs font-bold ${orderType === 'take_away' ? 'text-primary' : 'text-slate-700'}`}>Ambil Sendiri</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Ambil di resto (Pick-up)</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setOrderType('delivery')}
                                    className={`p-3.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                                        orderType === 'delivery'
                                            ? 'border-primary bg-primary/5 shadow-xs'
                                            : 'border-border hover:border-slate-300'
                                    }`}
                                >
                                    <Bike className={`w-6 h-6 mx-auto mb-1.5 ${orderType === 'delivery' ? 'text-primary' : 'text-slate-400'}`} />
                                    <p className={`text-xs font-bold ${orderType === 'delivery' ? 'text-primary' : 'text-slate-700'}`}>Antar ke Rumah</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Di antar Kurir (Delivery)</p>
                                </button>
                            </div>

                            {/* Data Kontak Pemesan Online */}
                            <div className="space-y-3 pt-2">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-slate-700">Nama Pemesan</label>
                                        <span className="text-[10px] text-slate-400">{customerName.length}/15 karakter</span>
                                    </div>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            maxLength={15}
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Nama Anda (2-15 karakter)"
                                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Min. 2 & maks. 15 karakter (nama asli).</p>
                                </div>

                                {orderType === 'delivery' && (
                                    <div className="space-y-3 animate-fade-in pt-1">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                                    <span>Titik Lokasi Pengantaran (Peta)</span>
                                                </label>
                                                <span className="text-[10px] text-slate-400">Akurat & Presisi</span>
                                            </div>
                                            <MapPicker
                                                initialLat={storeConfig?.lat || -6.2088}
                                                initialLng={storeConfig?.lng || 106.8456}
                                                onLocationSelect={handleLocationSelect}
                                                height="200px"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Klik tombol <span className="font-semibold text-slate-600">&apos;Lokasi Saya&apos;</span> agar pin otomatis melompat ke posisi Anda saat ini.
                                            </p>
                                        </div>

                                        {/* Status Kalkulasi Jarak & Ongkir */}
                                        {customerCoords && (
                                            <div
                                                className={`p-3 rounded-xl border text-xs transition-all ${
                                                    !shippingCalculation.allowed
                                                        ? 'bg-red-50 border-red-200 text-red-800'
                                                        : shippingCalculation.isFree
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                        : 'bg-primary/5 border-primary/20 text-secondary'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between font-bold">
                                                    <span className="flex items-center gap-1.5">
                                                        <Bike className="w-4 h-4 text-primary" />
                                                        <span>Jarak Antar: {distanceKm} km</span>
                                                    </span>
                                                    <span>
                                                        {!shippingCalculation.allowed
                                                            ? 'Jarak Terlalu Jauh'
                                                            : shippingCalculation.isFree
                                                            ? 'GRATIS ONGKIR'
                                                            : formatPrice(shippingCalculation.fee)}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] mt-1 opacity-80">{shippingCalculation.message}</p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Alamat Lengkap & Patokan Rumah
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <textarea
                                                    required
                                                    value={deliveryAddress}
                                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                                    placeholder="Contoh: Jl. Mawar No. 12, RT 02/03 (Pagar hitam, samping toko kelontong Bu Siti)"
                                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-xs resize-none h-20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Tip untuk Kurir */}
                                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-secondary flex items-center gap-1.5">
                                                    <HeartHandshake className="w-4 h-4 text-rose-500" />
                                                    <span>Beri Tip untuk Kurir?</span>
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {[0, 2000, 5000, 10000].map((tipVal) => (
                                                    <button
                                                        key={tipVal}
                                                        type="button"
                                                        onClick={() => {
                                                            setCourierTip(tipVal);
                                                            setCustomTipActive(false);
                                                        }}
                                                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                            !customTipActive && courierTip === tipVal
                                                                ? 'bg-primary text-white border-primary shadow-xs'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {tipVal === 0 ? 'Tanpa Tip' : `Rp ${(tipVal / 1000)}rb`}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="pt-1">
                                                {!customTipActive ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCustomTipActive(true);
                                                            setCourierTip(Number(customTipInput) || 0);
                                                        }}
                                                        className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                                                    >
                                                        + Masukkan Nominal Tip Lain
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            step="1000"
                                                            min="0"
                                                            value={customTipInput}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setCustomTipInput(val);
                                                                setCourierTip(Number(val) || 0);
                                                            }}
                                                            placeholder="Nominal tip (misal: 15000)"
                                                            className="flex-1 bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCustomTipActive(false);
                                                                setCourierTip(0);
                                                            }}
                                                            className="text-xs text-slate-400 hover:text-slate-600 px-2"
                                                        >
                                                            Batal
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pembayaran Online: Wajib QRIS */}
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-800 flex items-start gap-2.5">
                                <QrCode className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                <div>
                                    <span className="font-bold">Pembayaran Wajib QRIS:</span>
                                    <p className="text-[11px] text-amber-700 mt-0.5">
                                        Untuk semua pemesanan online, pesanan akan langsung diproses setelah men-scan barcode QRIS dan lunas terbayar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Section Khusus Pesanan Tamu di Meja Resto */
                        <>
                            {/* Nama Pemesan di Meja (Opsional) */}
                            <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Nama Pemesan (Opsional)</label>
                                    <span className="text-[10px] text-slate-400">Meja #{tableId}</span>
                                </div>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder={`Contoh: Budi (atau biarkan kosong untuk Meja #${tableId})`}
                                        maxLength={15}
                                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            {/* Pilihan: Dine In vs Take Away */}
                            <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
                                <h3 className="text-xs font-semibold text-slate-700 mb-2">Tipe Makan</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setOrderType('dine_in')}
                                        className={`p-3.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                                            orderType === 'dine_in'
                                                ? 'border-primary bg-primary/5 shadow-xs'
                                                : 'border-border hover:border-slate-300'
                                        }`}
                                    >
                                        <UtensilsCrossed className={`w-6 h-6 mx-auto mb-1.5 ${orderType === 'dine_in' ? 'text-primary' : 'text-slate-400'}`} />
                                        <p className={`text-xs font-bold ${orderType === 'dine_in' ? 'text-primary' : 'text-slate-600'}`}>Dine In</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Makan di meja #{tableId}</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrderType('take_away')}
                                        className={`p-3.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                                            orderType === 'take_away'
                                                ? 'border-primary bg-primary/5 shadow-xs'
                                                : 'border-border hover:border-slate-300'
                                        }`}
                                    >
                                        <ShoppingBag className={`w-6 h-6 mx-auto mb-1.5 ${orderType === 'take_away' ? 'text-primary' : 'text-slate-400'}`} />
                                        <p className={`text-xs font-bold ${orderType === 'take_away' ? 'text-primary' : 'text-slate-600'}`}>Take Away</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Bungkus pulang</p>
                                    </button>
                                </div>
                            </div>

                            {/* Info Metode Pembayaran: 100% QRIS */}
                            <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                        <QrCode className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs text-secondary">Metode Pembayaran: QRIS</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                            Bayar instan langsung dari meja tanpa perlu ke kasir. Scan via e-wallet & semua m-Banking.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Ringkasan Total Pesanan */}
                    <div className="bg-white rounded-2xl border border-border p-4 shadow-xs space-y-2 text-xs">
                        <div className="flex justify-between text-slate-500">
                            <span>Subtotal ({cart.length} item)</span>
                            <span>{formatPrice(cartTotal)}</span>
                        </div>
                        {orderType === 'delivery' && (
                            <div className="flex justify-between text-slate-500 items-center">
                                <span>Ongkos Kirim ({distanceKm > 0 ? `${distanceKm} km` : 'Tergantung Jarak'})</span>
                                <span className={shippingCalculation.isFree ? 'text-emerald-600 font-bold' : 'text-slate-700 font-semibold'}>
                                    {shippingCalculation.isFree ? 'GRATIS' : formatPrice(shippingCalculation.fee)}
                                </span>
                            </div>
                        )}
                        {orderType === 'delivery' && courierTip > 0 && (
                            <div className="flex justify-between text-slate-500 items-center">
                                <span>Tip Kurir</span>
                                <span className="text-primary font-semibold">{formatPrice(courierTip)}</span>
                            </div>
                        )}
                        <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-secondary">
                            <span>Total Tagihan</span>
                            <span className="text-primary text-base font-extrabold">{formatPrice(finalTotal)}</span>
                        </div>
                    </div>

                    {/* Tombol Kirim Pesanan */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-xl shadow-primary/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <span>Mengirim Pesanan...</span>
                            ) : (
                                <>
                                    <QrCode className="w-5 h-5" />
                                    <span>Bayar Sekarang • {formatPrice(finalTotal)}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Scan QRIS (Otomatis Mendeteksi Pembayaran via Webhook Real-time) */}
            {showQrisModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
                        {paymentSuccess ? (
                            /* Layar Sukses Otomatis */
                            <div className="py-8 text-center space-y-4 animate-fade-in">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-secondary">Pembayaran Berhasil!</h3>
                                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                        Mutasi QRIS berhasil terverifikasi. Pesanan Anda otomatis diteruskan ke dapur...
                                    </p>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 pt-2">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Mengalihkan ke status pesanan...</span>
                                </div>
                            </div>
                        ) : (
                            /* Layar QRIS Scan dengan Deteksi Otomatis Real-time */
                            <>
                                {/* Header Modal */}
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                            <QrCode className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-secondary">Scan Bayar QRIS</h3>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCancelOrder}
                                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                        title="Tutup / Batal"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Merchant Details */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
                                    <p className="font-bold text-xs text-secondary tracking-wide uppercase">
                                        {getPayhookConfig()?.merchantName || 'Bayar Via Qris, Konter'}
                                    </p>
                                    <p className="text-[10px] font-mono text-primary font-semibold mt-0.5">
                                        NMID: {getPayhookConfig()?.nmid || 'ID1026643315090'}
                                    </p>
                                </div>

                                {/* QR Code Container */}
                                <div className="relative p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-xs text-center">
                                    {qrisPayload ? (
                                        <QRCodeSVG
                                            value={qrisPayload}
                                            size={210}
                                            level="M"
                                            includeMargin={true}
                                            className="mx-auto rounded-xl"
                                        />
                                    ) : (
                                        <img
                                            src="/payhook-qris.jpg"
                                            alt="QRIS"
                                            className="w-full max-w-[210px] mx-auto rounded-xl object-contain"
                                        />
                                    )}
                                </div>

                                {/* Total Nominal Box */}
                                <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-3.5 text-center space-y-1.5">
                                    <span className="text-[11px] font-medium text-orange-800">Total Nominal yang Harus di Bayar:</span>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-2xl font-black text-orange-600 font-mono tracking-tight">
                                            {formatPrice(pendingOrderPayload?.payAmount || finalTotal)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(String(pendingOrderPayload?.payAmount || finalTotal));
                                                toast.success('Nominal disalin!');
                                            }}
                                            className="p-1 text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
                                            title="Salin Nominal"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {pendingOrderPayload?.uniqueCode > 0 && (
                                        <div className="pt-2 border-t border-orange-200/70 space-y-1 text-left">
                                            <div className="flex items-center justify-between text-[11px] text-orange-950/80">
                                                <span>Total Tagihan Pesanan:</span>
                                                <span>{formatPrice(pendingOrderPayload.totalPrice || pendingOrderPayload.baseTotal)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] font-bold text-orange-900">
                                                <span className="flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3 text-primary" />
                                                    Kode Unik Otomatis:
                                                </span>
                                                <span className="bg-orange-200/80 text-orange-950 font-mono px-2 py-0.5 rounded text-xs">
                                                    +{pendingOrderPayload.uniqueCode}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-orange-700/80 pt-0.5 leading-snug">
                                                *Nominal sudah terkunci otomatis di QRIS. Cukup scan dan bayar untuk verifikasi instan.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Radar Live Auto-Detection (Pengganti tombol manual) */}
                                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center gap-3">
                                    <div className="relative flex h-3 w-3 shrink-0 ml-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-xs font-bold text-amber-900">Menunggu Pembayaran Otomatis...</p>
                                        <p className="text-[10px] text-amber-700/90 leading-tight mt-0.5">
                                            Silakan transfer dari m-Banking/e-Wallet. Sistem akan mendeteksi mutasi dan beralih otomatis tanpa perlu klik apa pun.
                                        </p>
                                    </div>
                                </div>

                                {/* Fallback Options */}
                                <div className="space-y-1.5 text-center pt-1">
                                    <button
                                        type="button"
                                        onClick={handleManualCheckPayment}
                                        disabled={manualChecking}
                                        className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors cursor-pointer py-1 disabled:opacity-50"
                                    >
                                        {manualChecking ? 'Sedang Memeriksa...' : 'Sudah transfer tapi belum terdeteksi? Cek Status'}
                                    </button>
                                    <div>
                                        <button
                                            type="button"
                                            onClick={handleCancelOrder}
                                            className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer py-1"
                                        >
                                            Batal / Ubah Pesanan
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                  </div>
                </div>
            )}
        </div>
    );
}
