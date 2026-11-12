import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToOrders } from '../../services/orderService';
import { ShoppingBag, DollarSign, Clock, TrendingUp, ChefHat } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

export default function DashboardPage() {
    const { storeId, storeData } = useAuth();
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

    const today = new Date().toDateString();
    const todayOrders = orders.filter((o) => {
        const d = parseDate(o.createdAt || o.created_at);
        return d && d.toDateString() === today;
    });
    const todayRevenue = todayOrders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === 'pending');
    const recentOrders = orders.slice(0, 8);

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

    if (loading) return <Spinner />;

    const stats = [
        { label: 'Pesanan Hari Ini', value: todayOrders.length, icon: ShoppingBag, color: 'bg-blue-500', light: 'bg-blue-50' },
        { label: 'Pendapatan', value: formatPrice(todayRevenue), icon: DollarSign, color: 'bg-emerald-500', light: 'bg-emerald-50' },
        { label: 'Menunggu', value: pendingOrders.length, icon: Clock, color: 'bg-amber-500', light: 'bg-amber-50' },
        { label: 'Total Pesanan', value: orders.length, icon: TrendingUp, color: 'bg-purple-500', light: 'bg-purple-50' },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-secondary">Dashboard</h1>
                <p className="text-slate-500 text-sm mt-1">Selamat datang di panel admin {storeData?.name || 'toko Anda'}</p>
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
                        {recentOrders.map((order) => (
                            <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <ShoppingBag className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-secondary">
                                            Meja #{order.tableNumber || '?'}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {order.items?.length || 0} item · {formatTime(order.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm text-secondary">{formatPrice(order.totalPrice)}</p>
                                    <Badge status={order.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
