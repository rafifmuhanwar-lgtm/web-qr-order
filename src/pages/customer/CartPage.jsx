import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createOrder } from '../../services/orderService';
import { getStore } from '../../services/storeService';
import { parseStoreConfig, calculateDistanceKm, calculateShippingFee } from '../../utils/deliveryUtils';
import { validateCustomerName } from '../../utils/nameValidator';
import { getPayhookConfig } from '../../services/payhookService';
import { generateDynamicQris, generateUniqueAmount, MASTER_QRIS_STATIC } from '../../utils/qrisUtils';
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

    // QRIS Flow Modal State (Order is NOT saved in DB until payment is confirmed!)
    const [showQrisModal, setShowQrisModal] = useState(false);
    const [pendingOrderPayload, setPendingOrderPayload] = useState(null);
    const [verifyingPayment, setVerifyingPayment] = useState(false);
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
            totalPrice: payAmount, // Nominal dengan 3 digit kode unik agar Payhook otomatis mendeteksi mutasi bank
            notes: cart.map(i => i.notes ? `${i.name}: ${i.notes}` : '').filter(Boolean).join(' | '),
            userNotes: cart.map(i => i.notes ? `${i.name}: ${i.notes}` : '').filter(Boolean).join(' | '),
            orderType: finalOrderType,
            paymentMethod: 'qris',
            paymentStatus: 'paid', // Saved as paid upon confirmation!
            status: 'pending',
        };

        // 2. Prepare Dynamic QRIS Code dengan nominal terkunci otomatis (termasuk kode unik)
        const rawStatic = payhookCfg?.rawStaticQris || MASTER_QRIS_STATIC;
        const dynamicCode = generateDynamicQris(rawStatic, payAmount);

        setQrisPayload(dynamicCode);
        setPendingOrderPayload(orderData);
        setShowQrisModal(true);
    };

    const handleConfirmAndCreateOrder = async () => {
        if (!pendingOrderPayload || submitting) return;

        setSubmitting(true);
        setVerifyingPayment(true);

        try {
            // Short 800ms verification state for user confidence
            await new Promise((r) => setTimeout(r, 800));

            // ONLY HERE: Save order into database after scan/payment is confirmed!
            const orderId = await createOrder(pendingOrderPayload);

            // Clear active cart from memory and session
            setCart([]);
            sessionStorage.removeItem(`cart_${storeId}_${tableId || 'online'}`);
            if (storeId) {
                sessionStorage.setItem(`emakan_active_order_${storeId}`, orderId);
            }

            toast.success('Pembayaran QRIS Berhasil! Pesanan diteruskan ke dapur.');
            setShowQrisModal(false);
            navigate(`/order-status/${orderId}`);
        } catch (err) {
            console.error('Error confirming order:', err);
            toast.error('Gagal memproses pesanan. Silakan coba lagi.');
        } finally {
            setVerifyingPayment(false);
            setSubmitting(false);
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

            {/* Modal Scan QRIS (Pesanan BELUM masuk database sebelum pembayaran dikonfirmasi) */}
            {showQrisModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
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
                                onClick={() => {
                                    if (!verifyingPayment) {
                                        setShowQrisModal(false);
                                        setPendingOrderPayload(null);
                                    }
                                }}
                                disabled={verifyingPayment}
                                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-30"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Merchant Details */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
                            <p className="font-bold text-xs text-secondary tracking-wide uppercase">
                                {getPayhookConfig()?.merchantName || 'eMakan Merchant'}
                            </p>
                            <p className="text-[10px] font-mono text-primary font-semibold mt-0.5">
                                NMID: {getPayhookConfig()?.nmid || 'ID1026490305079'}
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
                                    {formatPrice(pendingOrderPayload?.totalPrice || finalTotal)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(String(pendingOrderPayload?.totalPrice || finalTotal));
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
                                        <span>Total Tagihan:</span>
                                        <span>{formatPrice(pendingOrderPayload.baseTotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-bold text-orange-900">
                                        <span className="flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-primary" />
                                            Kode Unik:
                                        </span>
                                        <span className="bg-orange-200/80 text-orange-950 font-mono px-2 py-0.5 rounded text-xs">
                                            +{pendingOrderPayload.uniqueCode}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-orange-700/80 pt-0.5 leading-snug">
                                        *Silahkan Scan sesuai nominal + 3 digit kode unik agar pembayaran terverifikasi otomatis oleh sistem.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Petunjuk Singkat */}
                        <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 space-y-1">
                            <p className="font-semibold text-slate-700">Cara Pembayaran:</p>
                            <p>1. Buka e-wallet, atau m-Banking pilihan Anda.</p>
                            <p>2. Scan kode QRIS di atas. Nominal sudah tertera otomatis.</p>
                            <p>3. Selesaikan transfer, lalu klik tombol konfirmasi di bawah.</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-1">
                            <button
                                type="button"
                                onClick={handleConfirmAndCreateOrder}
                                disabled={verifyingPayment}
                                className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {verifyingPayment ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Memverifikasi Pembayaran...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Saya Sudah Bayar</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!verifyingPayment) {
                                        setShowQrisModal(false);
                                        setPendingOrderPayload(null);
                                    }
                                }}
                                disabled={verifyingPayment}
                                className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                            >
                                Batal / Ubah Pesanan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
