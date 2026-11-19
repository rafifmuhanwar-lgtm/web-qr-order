import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToOrders } from '../../services/orderService';
import { calculateWalletSummary } from '../../services/walletService';
import {
    ShoppingBag,
    DollarSign,
    Clock,
    TrendingUp,
    ChefHat,
    Bike,
    Wallet,
    ArrowUpRight,
    ShieldCheck,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export default function DashboardPage() {
    const { storeId, storeData } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!storeId) return;
        const unsubscribe = subscribeToOrders(storeId, (data) => {
            setOrders(data);
            setLoading(false);
        }, (error) => {
            console.error('Dashboard error:', error);
            setLoading(false);
        });
        return unsubscribe;
    }, [storeId]);

    const parseDate = (ts) => {
        if (!ts) return null;
        if (typeof ts?.toDate === 'function') return ts.toDate();
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
    };

    // Filter strictly for food orders (exclude customer inquiry & standalone chat threads)
    const foodOrders = useMemo(() => {
        return orders.filter(
            (o) => o.orderType !== 'customer_chat' && o.orderType !== 'inquiry' && o.status !== 'inquiry'
        );
    }, [orders]);

    const today = new Date().toDateString();
    const todayOrders = foodOrders.filter((o) => {
        const d = parseDate(o.createdAt || o.created_at);
        return d && d.toDateString() === today;
    });
    const todayRevenue = todayOrders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const pendingOrders = foodOrders.filter((o) => o.status === 'pending');
    const recentOrders = foodOrders.slice(0, 8);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const formatTime = (timestamp) => {
        const d = parseDate(timestamp);
        if (!d) return '-';
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const walletSummary = useMemo(() => {
        const withdrawals = Array.isArray(storeData?.withdrawals) ? storeData.withdrawals : [];
        return calculateWalletSummary(orders, withdrawals);
    }, [orders, storeData?.withdrawals]);

    if (loading) return <Spinner />;

    const stats = [
        { label: 'Pesanan Hari Ini', value: todayOrders.length, icon: ShoppingBag, color: 'bg-blue-500', light: 'bg-blue-50' },
        { label: 'Pendapatan', value: formatPrice(todayRevenue), icon: DollarSign, color: 'bg-emerald-500', light: 'bg-emerald-50' },
        { label: 'Menunggu', value: pendingOrders.length, icon: Clock, color: 'bg-amber-500', light: 'bg-amber-50' },
        { label: 'Total Pesanan', value: foodOrders.length, icon: TrendingUp, color: 'bg-purple-500', light: 'bg-purple-50' },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-secondary">Dashboard</h1>
                <p className="text-slate-500 text-sm mt-1">Selamat datang di panel admin {storeData?.name || 'toko Anda'}</p>
            </div>

            {/* Escrow Balance Card */}
            <div className="bg-gradient-to-br from-secondary via-slate-900 to-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-slate-700/50">
                <div className="space-y-1.5 relative z-10">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/20 px-2.5 py-0.5 rounded-full border border-primary/30 inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            Saldo Dompet Escrow (QRIS)
                        </span>
                        {walletSummary.pendingBalance > 0 && (
                            <span className="text-[10px] font-semibold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                                Proses Transfer: {formatPrice(walletSummary.pendingBalance)}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-300 font-medium pt-0.5">Saldo Tersedia untuk Ditarik:</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                        {formatPrice(walletSummary.availableBalance)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                        Total Pemasukan QRIS: {formatPrice(walletSummary.grossRevenue)} • Sudah Dicairkan: {formatPrice(walletSummary.totalWithdrawn)}
                    </p>
                </div>
                <div className="flex items-center gap-2.5 self-start md:self-auto relative z-10">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/wallet')}
                        className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/25 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Tarik Saldo</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/wallet')}
                        className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
                    >
                        Riwayat & Rekening
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`w-10 h-10 ${stat.light} rounded-xl flex items-center justify-center mb-3`}>
                            <stat.icon className={`w-5 h-5 text-white ${stat.color} rounded-lg p-1 w-7 h-7`} />
                        </div>
                        <p className="text-2xl font-bold text-secondary">{stat.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl border border-border shadow-sm">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold text-secondary">Pesanan Terbaru</h2>
                </div>
                {recentOrders.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                        <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Belum ada pesanan</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {recentOrders.map((order) => {
                            const isTableOrder = Boolean(order.tableNumber);
                            const orderTitle = isTableOrder
                                ? `Meja #${order.tableNumber}`
                                : `Order #${order.id.slice(0, 6)}`;
                            const isDelivery = order.orderType === 'delivery';

                            return (
                                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                            isDelivery ? 'bg-orange-500/10 text-orange-600' : 'bg-primary/10 text-primary'
                                        }`}>
                                            {isDelivery ? <Bike className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-sm text-secondary">
                                                    {orderTitle}
                                                </p>
                                                {!isTableOrder && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-600">
                                                        {isDelivery ? 'Delivery' : 'Online'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {order.customerName ? `${order.customerName} · ` : ''}
                                                {order.items?.length || 0} item · {formatTime(order.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-sm text-secondary">{formatPrice(order.totalPrice)}</p>
                                        <Badge status={order.status} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
