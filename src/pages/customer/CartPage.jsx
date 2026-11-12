import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createOrder } from '../../services/orderService';
import { supabase } from '../../config/supabase';
import {
    ArrowLeft,
    Minus,
    Plus,
    Trash2,
    StickyNote,
    ChefHat,
    QrCode,
    Banknote,
    UtensilsCrossed,
    ShoppingBag,
    Bike,
    MapPin,
    Phone,
    User,
    CheckCircle2
} from 'lucide-react';
import Button from '../../components/ui/Button';
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
    const [generalNotes, setGeneralNotes] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [orderType, setOrderType] = useState(isOnlineOrder ? 'take_away' : 'dine_in');
    const [paymentMethod, setPaymentMethod] = useState(isOnlineOrder ? 'qris' : '');

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [cart]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

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

        if (isOnlineOrder) {
            if (!customerName.trim()) {
                toast.error('Mohon isi nama pemesan');
                return;
            }
            if (!customerPhone.trim()) {
                toast.error('Mohon isi nomor WhatsApp aktif');
                return;
            }
            if (orderType === 'delivery' && !deliveryAddress.trim()) {
                toast.error('Mohon isi alamat pengiriman lengkap');
                return;
            }
        } else {
            if (!orderType) {
                toast.error('Pilih tipe pesanan (Dine In / Take Away)');
                return;
            }
            if (!paymentMethod) {
                toast.error('Pilih metode pembayaran (QRIS / Kasir)');
                return;
            }
        }

        setSubmitting(true);
        try {
            const selectedPayment = isOnlineOrder ? 'qris' : paymentMethod;
            const finalOrderType = isOnlineOrder ? orderType : (orderType || 'dine_in');

            const orderData = {
                storeId,
                tableId: tableId || null,
                tableNumber: tableId ? String(tableId).padStart(3, '0') : null,
                customerName: customerName.trim() || (tableId ? `Tamu Meja #${String(tableId).padStart(3, '0')}` : 'Pelanggan Online'),
                customerPhone: customerPhone ? customerPhone.trim() : null,
                deliveryAddress: finalOrderType === 'delivery' ? deliveryAddress.trim() : null,
                items: cart.map((item) => ({
                    menuId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    notes: item.notes || '',
                })),
                totalPrice: cartTotal,
                notes: generalNotes,
                orderType: finalOrderType,
                paymentMethod: selectedPayment,
                paymentStatus: selectedPayment === 'cash' ? 'pay_at_counter' : 'pending',
            };

            const orderId = await createOrder(orderData);
            sessionStorage.removeItem(`cart_${storeId}_${tableId || 'online'}`);

            if (selectedPayment === 'qris') {
                toast.loading('Menghasilkan QRIS...', { id: 'qris_load' });
                try {
                    const qrisDesc = tableId
                        ? `Meja ${orderData.tableNumber} - ${orderData.customerName}`
                        : `Online - ${orderData.customerName} (${finalOrderType === 'delivery' ? 'Antar' : 'Ambil'})`;

                    const { data: qrisData, error } = await supabase.functions.invoke('create-qris', {
                        body: {
                            amount: cartTotal,
                            description: qrisDesc,
                        }
                    });
                    toast.dismiss('qris_load');
                    if (error || !qrisData?.success) {
                        toast.error('Gagal membuat QRIS');
                        navigate(`/order-status/${orderId}`);
                    } else {
                        toast.success('Pesanan dikirim! Silakan scan QRIS');
                        navigate(`/order-status/${orderId}`, { state: { qrisUrl: qrisData.data.qr_url } });
                    }
                } catch {
                    toast.dismiss('qris_load');
                    toast.error('Gagal membuat QRIS');
                    navigate(`/order-status/${orderId}`);
                }
            } else {
                toast.success('Pesanan berhasil dikirim!');
                navigate(`/order-status/${orderId}`);
            }
        } catch {
            toast.error('Gagal mengirim pesanan');
        } finally {
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
                        {isOnlineOrder ? '🛍️ Pesan Online / Dari Rumah' : `Meja #${String(tableId).padStart(3, '0')}`} · {cart.length} item
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
                                            <div className="flex items-center gap-1 mt-1">
                                                <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />
                                                <span className="text-xs text-amber-600 truncate">{item.notes}</span>
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

                    {/* Catatan Khusus */}
                    <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan Tambahan untuk Dapur</label>
                        <textarea
                            value={generalNotes}
                            onChange={(e) => setGeneralNotes(e.target.value)}
                            placeholder="Contoh: Sambal dipisah, jangan pakai daun bawang, es sedikit..."
                            className="w-full p-3 rounded-xl border border-border text-sm resize-none h-18 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
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
                                    <p className="text-[10px] text-slate-400 mt-0.5">Kirim via kurir/ojol</p>
                                </button>
                            </div>

                            {/* Data Kontak Pemesan Online */}
                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Pemesan</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Nama Anda"
                                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Nomor WhatsApp Aktif</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="tel"
                                            required
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="08123456789"
                                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Kasir akan menghubungi nomor ini saat pesanan siap.</p>
                                </div>

                                {orderType === 'delivery' && (
                                    <div className="animate-fade-in">
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Pengiriman & Patokan</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <textarea
                                                required
                                                value={deliveryAddress}
                                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                                placeholder="Jl. Mawar No. 12, RT 02/03 (Pagar hitam samping pos satpam)"
                                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-xs resize-none h-20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            />
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
                                        Untuk pesanan dari rumah, pesanan akan langsung diproses dapur setelah QRIS terbayar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Section Khusus Pesanan Tamu di Meja Resto */
                        <>
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

                            {/* Pilihan Metode Pembayaran Meja */}
                            <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
                                <h3 className="text-xs font-semibold text-slate-700 mb-2">Metode Pembayaran</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('qris')}
                                        className={`p-3.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                                            paymentMethod === 'qris'
                                                ? 'border-primary bg-primary/5 shadow-xs'
                                                : 'border-border hover:border-slate-300'
                                        }`}
                                    >
                                        <QrCode className={`w-6 h-6 mx-auto mb-1.5 ${paymentMethod === 'qris' ? 'text-primary' : 'text-slate-400'}`} />
                                        <p className={`text-xs font-bold ${paymentMethod === 'qris' ? 'text-primary' : 'text-slate-600'}`}>QRIS</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Scan langsung</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`p-3.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                                            paymentMethod === 'cash'
                                                ? 'border-primary bg-primary/5 shadow-xs'
                                                : 'border-border hover:border-slate-300'
                                        }`}
                                    >
                                        <Banknote className={`w-6 h-6 mx-auto mb-1.5 ${paymentMethod === 'cash' ? 'text-primary' : 'text-slate-400'}`} />
                                        <p className={`text-xs font-bold ${paymentMethod === 'cash' ? 'text-primary' : 'text-slate-600'}`}>Bayar di Kasir</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Tunai di kasir</p>
                                    </button>
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
                            <div className="flex justify-between text-slate-500">
                                <span>Ongkos Kirim</span>
                                <span className="text-emerald-600 font-semibold">Dikonfirmasi via WA</span>
                            </div>
                        )}
                        <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-secondary">
                            <span>Total Tagihan</span>
                            <span className="text-primary text-base font-extrabold">{formatPrice(cartTotal)}</span>
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
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>{isOnlineOrder ? 'Kirim Pesanan & Bayar QRIS' : 'Kirim Pesanan Sekarang'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
