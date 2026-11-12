import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createOrder } from '../../services/orderService';
import { supabase } from '../../config/supabase';
import { ArrowLeft, Minus, Plus, Trash2, StickyNote, ChefHat, QrCode, Banknote, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function CartPage() {
    const { storeId, tableId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [cart, setCart] = useState(location.state?.cart || []);
    const [submitting, setSubmitting] = useState(false);
    const [generalNotes, setGeneralNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [orderType, setOrderType] = useState('');

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
        setCart((prev) =>
            prev
                .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
                .filter((i) => i.quantity > 0)
        );
    };

    const removeItem = (id) => {
        setCart((prev) => prev.filter((i) => i.id !== id));
    };

    const handleSubmit = async () => {
        if (cart.length === 0) {
            toast.error('Keranjang kosong');
            return;
        }
        if (!orderType) {
            toast.error('Pilih tipe pesanan (Dine In / Take Away)');
            return;
        }
        if (!paymentMethod) {
            toast.error('Pilih metode pembayaran');
            return;
        }

        setSubmitting(true);
        try {
            const orderData = {
                storeId,
                tableId,
                tableNumber: String(tableId).padStart(3, '0'),
                items: cart.map((item) => ({
                    menuId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    notes: item.notes || '',
                })),
                totalPrice: cartTotal,
                notes: generalNotes,
                orderType,
                paymentMethod,
                paymentStatus: paymentMethod === 'cash' ? 'pay_at_counter' : 'pending',
            };

            const orderId = await createOrder(orderData);
            sessionStorage.removeItem(`cart_${storeId}_${tableId}`);

            if (paymentMethod === 'qris') {
                toast.loading('Menghasilkan QRIS...', { id: 'qris_load' });
                try {
                    const { data: qrisData, error } = await supabase.functions.invoke('create-qris', {
                        body: { 
                            amount: cartTotal, 
                            description: `Pesanan Meja ${orderData.tableNumber}` 
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

    return (
        <>
            <div className="animate-fade-in">
                {/* Header */}
                <div className="bg-white border-b border-border p-4 flex items-center gap-3 sticky top-0 z-20">
                    <button
                        onClick={() => navigate(`/order/${storeId}/${tableId}`)}
                        className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="font-bold text-secondary">Keranjang</h1>
                        <p className="text-xs text-slate-400">{cart.length} item</p>
                    </div>
                </div>

                {cart.length === 0 ? (
                    <div className="text-center py-20 px-4">
                        <ChefHat className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="font-semibold text-slate-600 mb-2">Keranjang kosong</h3>
                        <p className="text-sm text-slate-400 mb-4">Yuk tambahkan menu favoritmu!</p>
                        <Button onClick={() => navigate(`/order/${storeId}/${tableId}`)}>
                            Lihat Menu
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Cart Items */}
                        <div className="p-4 space-y-3">
                            {cart.map((item) => (
                                <div key={item.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ChefHat className="w-6 h-6 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-sm text-secondary">{item.name}</h3>
                                            <p className="text-primary font-bold text-sm mt-0.5">{formatPrice(item.price)}</p>
                                            {item.notes && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <StickyNote className="w-3 h-3 text-amber-500" />
                                                    <span className="text-xs text-amber-600">{item.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-danger cursor-pointer">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
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
                                        <span className="font-bold text-secondary">{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* General Notes */}
                        <div className="px-4 mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan tambahan</label>
                            <textarea
                                value={generalNotes}
                                onChange={(e) => setGeneralNotes(e.target.value)}
                                placeholder="Ada pesan khusus? Cantumkan disini ya!"
                                className="w-full p-3 rounded-xl border border-border text-sm resize-none h-20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>

                        {/* Order Type: Dine In / Take Away */}
                        <div className="px-4 mb-4">
                            <h3 className="text-sm font-medium text-slate-700 mb-2">Tipe Pesanan</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setOrderType('dine_in')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer
                                        ${orderType === 'dine_in'
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border hover:border-slate-300'
                                        }`}
                                >
                                    <UtensilsCrossed className={`w-7 h-7 mx-auto mb-2 ${orderType === 'dine_in' ? 'text-primary' : 'text-slate-400'}`} />
                                    <p className={`text-sm font-semibold ${orderType === 'dine_in' ? 'text-primary' : 'text-slate-600'}`}>Dine In</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Makan di tempat</p>
                                </button>
                                <button
                                    onClick={() => setOrderType('take_away')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer
                                        ${orderType === 'take_away'
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border hover:border-slate-300'
                                        }`}
                                >
                                    <ShoppingBag className={`w-7 h-7 mx-auto mb-2 ${orderType === 'take_away' ? 'text-primary' : 'text-slate-400'}`} />
                                    <p className={`text-sm font-semibold ${orderType === 'take_away' ? 'text-primary' : 'text-slate-600'}`}>Take Away</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Bawa pulang</p>
                                </button>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="px-4 mb-4">
                            <h3 className="text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPaymentMethod('qris')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer
                                        ${paymentMethod === 'qris'
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border hover:border-slate-300'
                                        }`}
                                >
                                    <QrCode className={`w-7 h-7 mx-auto mb-2 ${paymentMethod === 'qris' ? 'text-primary' : 'text-slate-400'}`} />
                                    <p className={`text-sm font-semibold ${paymentMethod === 'qris' ? 'text-primary' : 'text-slate-600'}`}>QRIS</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Scan & Bayar</p>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer
                                        ${paymentMethod === 'cash'
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border hover:border-slate-300'
                                        }`}
                                >
                                    <Banknote className={`w-7 h-7 mx-auto mb-2 ${paymentMethod === 'cash' ? 'text-primary' : 'text-slate-400'}`} />
                                    <p className={`text-sm font-semibold ${paymentMethod === 'cash' ? 'text-primary' : 'text-slate-600'}`}>Kasir</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Bayar Langsung</p>
                                </button>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="px-4 mb-24">
                            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                                <h3 className="font-bold text-secondary mb-3">Ringkasan Pesanan</h3>
                                <div className="space-y-2 text-sm">
                                    {cart.map((item) => (
                                        <div key={item.id} className="flex justify-between text-slate-600">
                                            <span>{item.name} × {item.quantity}</span>
                                            <span>{formatPrice(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-secondary">
                                        <span>Total</span>
                                        <span className="text-primary text-base">{formatPrice(cartTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Submit Button - outside animated div so it doesn't jump */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 max-w-lg mx-auto z-30">
                    <Button
                        onClick={handleSubmit}
                        loading={submitting}
                        size="lg"
                        className="w-full py-4 rounded-2xl text-base shadow-2xl shadow-primary/30"
                    >
                        Kirim Pesanan — {formatPrice(cartTotal)}
                    </Button>
                </div>
            )}
        </>
    );
}
