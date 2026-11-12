import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToOrders, exportOrdersToCSV } from '../../services/orderService';
import {
    BarChart3, Download, ShoppingBag, DollarSign, TrendingUp,
    Calendar, ChevronLeft, ChevronRight, X, Clock, Package, UtensilsCrossed
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function ReportPage() {
    const { storeId } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Calendar state
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    // Subscribe to all orders (real-time)
    useEffect(() => {
        if (!storeId) return;
        const unsubscribe = subscribeToOrders(storeId, (data) => {
            setOrders(data);
            setLoading(false);
        }, (error) => {
            console.error('Report error:', error);
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

    const today = useMemo(() => new Date(), []);

    // Filter today's orders
    const todayOrders = useMemo(() => {
        const todayStr = today.toDateString();
        return orders.filter((o) => {
            const d = parseDate(o.createdAt || o.created_at);
            return d && d.toDateString() === todayStr;
        });
    }, [orders, today]);

    // Today's stats
    const todayRevenue = useMemo(() =>
        todayOrders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + (o.totalPrice || 0), 0),
        [todayOrders]
    );
    const todayCompleted = useMemo(() =>
        todayOrders.filter((o) => o.status === 'completed').length,
        [todayOrders]
    );
    const todayPending = useMemo(() =>
        todayOrders.filter((o) => o.status === 'pending').length,
        [todayOrders]
    );

    // Per-item summary for today
    const itemSummary = useMemo(() => {
        const map = {};
        todayOrders
            .filter((o) => o.status !== 'cancelled')
            .forEach((order) => {
                order.items?.forEach((item) => {
                    if (!map[item.name]) {
                        map[item.name] = { name: item.name, qty: 0, revenue: 0 };
                    }
                    map[item.name].qty += item.quantity;
                    map[item.name].revenue += item.price * item.quantity;
                });
            });
        return Object.values(map).sort((a, b) => b.qty - a.qty);
    }, [todayOrders]);

    // ---- Calendar logic: filter from already-loaded orders by month ----
    const monthOrders = useMemo(() => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        return orders.filter((o) => {
            const d = parseDate(o.createdAt || o.created_at);
            if (!d) return false;
            return d.getFullYear() === year && d.getMonth() === month;
        });
    }, [orders, calendarDate]);

    // Group month orders by day number
    const ordersByDay = useMemo(() => {
        const map = {};
        monthOrders.forEach((order) => {
            const date = parseDate(order.createdAt || order.created_at);
            if (!date) return;
            const day = date.getDate();
            if (!map[day]) map[day] = [];
            map[day].push(order);
        });
        return map;
    }, [monthOrders]);

    // Calendar grid
    const calendarGrid = useMemo(() => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const grid = [];
        for (let i = 0; i < firstDay; i++) grid.push(null);
        for (let d = 1; d <= daysInMonth; d++) grid.push(d);
        return grid;
    }, [calendarDate]);

    // Open calendar & auto-select today
    const openCalendar = () => {
        const now = new Date();
        setCalendarDate(now);
        setSelectedDay(now.getDate());
        setShowCalendar(true);
    };

    const changeMonth = (delta) => {
        const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + delta, 1);
        setCalendarDate(newDate);
        setSelectedDay(null);
    };

    // Selected day's orders
    const selectedDayOrders = useMemo(() => {
        if (!selectedDay) return [];
        return ordersByDay[selectedDay] || [];
    }, [selectedDay, ordersByDay]);

    // Selected day's item summary
    const selectedDayItems = useMemo(() => {
        const map = {};
        selectedDayOrders
            .filter((o) => o.status !== 'cancelled')
            .forEach((order) => {
                order.items?.forEach((item) => {
                    if (!map[item.name]) {
                        map[item.name] = { name: item.name, qty: 0, revenue: 0 };
                    }
                    map[item.name].qty += item.quantity;
                    map[item.name].revenue += item.price * item.quantity;
                });
            });
        return Object.values(map).sort((a, b) => b.qty - a.qty);
    }, [selectedDayOrders]);

    const selectedDayRevenue = useMemo(() =>
        selectedDayOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.totalPrice || 0), 0),
        [selectedDayOrders]
    );

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    const formatTime = (timestamp) => {
        const d = parseDate(timestamp);
        if (!d) return '-';
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <Spinner />;

    return (
        <div className="animate-fade-in space-y-5">
            {/* Header — mobile friendly */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-secondary">Laporan</h1>
                    <p className="text-slate-500 text-xs sm:text-sm">
                        {today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openCalendar}>
                        <Calendar className="w-4 h-4" /> Riwayat
                    </Button>
                    {todayOrders.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => exportOrdersToCSV(todayOrders)}>
                            <Download className="w-4 h-4" /> CSV
                        </Button>
                    )}
                </div>
            </div>

            {/* Today's Stats — 2 cols on mobile */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-border p-3 sm:p-4 shadow-sm">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
                        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-secondary">{todayOrders.length}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Pesanan Hari Ini</p>
                </div>
                <div className="bg-white rounded-xl border border-border p-3 sm:p-4 shadow-sm">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2">
                        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-secondary truncate">{formatPrice(todayRevenue)}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Pendapatan</p>
                </div>
                <div className="bg-white rounded-xl border border-border p-3 sm:p-4 shadow-sm">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-2">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-secondary">{todayCompleted}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Selesai</p>
                </div>
                <div className="bg-white rounded-xl border border-border p-3 sm:p-4 shadow-sm">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-lg flex items-center justify-center mb-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-secondary">{todayPending}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Menunggu</p>
                </div>
            </div>

            {/* Item Summary - Today */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-primary" />
                    <h2 className="font-bold text-sm text-secondary">Ringkasan Item Hari Ini</h2>
                </div>
                {itemSummary.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Belum ada pesanan hari ini</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {itemSummary.map((item, idx) => (
                            <div key={item.name} className="flex items-center px-4 py-2.5 hover:bg-slate-50 transition-colors gap-3">
                                <span className="text-xs text-slate-400 font-medium w-5 shrink-0">{idx + 1}</span>
                                <span className="text-sm font-medium text-secondary truncate flex-1 min-w-0">{item.name}</span>
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                    {item.qty}×
                                </span>
                                <span className="text-sm font-semibold text-secondary shrink-0 w-20 sm:w-24 text-right">
                                    {formatPrice(item.revenue)}
                                </span>
                            </div>
                        ))}
                        {/* Total row */}
                        <div className="flex items-center px-4 py-2.5 bg-slate-50 gap-3">
                            <span className="w-5 shrink-0"></span>
                            <span className="text-sm font-bold text-secondary flex-1">Total</span>
                            <span className="text-xs font-bold text-secondary shrink-0">
                                {itemSummary.reduce((s, i) => s + i.qty, 0)}×
                            </span>
                            <span className="text-sm font-bold text-primary shrink-0 w-20 sm:w-24 text-right">
                                {formatPrice(todayRevenue)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Today's Orders List */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <h2 className="font-bold text-sm text-secondary">Daftar Pesanan Hari Ini</h2>
                </div>
                {todayOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Belum ada pesanan hari ini</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {todayOrders.map((order) => (
                            <div key={order.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-secondary">Meja #{order.tableNumber || '?'}</p>
                                            <p className="text-[10px] text-slate-400">{formatTime(order.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-primary">{formatPrice(order.totalPrice)}</p>
                                        <Badge status={order.status} />
                                    </div>
                                </div>
                                <div className="ml-10 flex flex-wrap gap-1">
                                    {order.items?.map((item, idx) => (
                                        <span key={idx} className="text-[10px] sm:text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                            {item.name} ×{item.quantity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Calendar Modal */}
            {showCalendar && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => { setShowCalendar(false); setSelectedDay(null); }} />
                    <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto">
                        {/* Calendar Header */}
                        <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border rounded-t-2xl">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-base text-secondary">Riwayat Pesanan</h3>
                                <button onClick={() => { setShowCalendar(false); setSelectedDay(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                                </button>
                                <h4 className="font-semibold text-sm text-secondary">
                                    {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                                </h4>
                                <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                                    <ChevronRight className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            {/* Day Headers */}
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {DAYS.map((d) => (
                                    <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarGrid.map((day, idx) => {
                                    if (day === null) return <div key={`empty-${idx}`} />;

                                    const dayOrders = ordersByDay[day] || [];
                                    const hasOrders = dayOrders.length > 0;
                                    const isToday = day === today.getDate() &&
                                        calendarDate.getMonth() === today.getMonth() &&
                                        calendarDate.getFullYear() === today.getFullYear();
                                    const isSelected = selectedDay === day;

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(isSelected ? null : day)}
                                            className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs sm:text-sm transition-all cursor-pointer
                                                ${isSelected ? 'bg-primary text-white shadow-md shadow-primary/30 scale-105' : ''}
                                                ${isToday && !isSelected ? 'bg-primary/10 text-primary font-bold ring-2 ring-primary/30' : ''}
                                                ${!isSelected && !isToday ? 'hover:bg-slate-100' : ''}
                                            `}
                                        >
                                            <span className={`font-medium ${!isSelected && !isToday ? (hasOrders ? 'text-secondary' : 'text-slate-400') : ''}`}>{day}</span>
                                            {hasOrders && (
                                                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white/70' : 'bg-primary'}`} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Selected Day Detail */}
                            {selectedDay && (
                                <div className="mt-4 animate-fade-in">
                                    <div className="border-t border-border pt-3">
                                        <h4 className="font-bold text-sm text-secondary mb-3">
                                            {selectedDay} {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                                            <span className="font-normal text-xs text-slate-400 ml-2">
                                                — {selectedDayOrders.length} pesanan
                                            </span>
                                        </h4>

                                        {selectedDayOrders.length === 0 ? (
                                            <div className="text-center py-6 text-slate-400">
                                                <Package className="w-8 h-8 mx-auto mb-1 opacity-50" />
                                                <p className="text-xs">Tidak ada pesanan</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Day Stats */}
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                                                        <p className="text-base font-bold text-secondary">{selectedDayOrders.length}</p>
                                                        <p className="text-[10px] text-slate-500">Pesanan</p>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                                                        <p className="text-base font-bold text-primary truncate">{formatPrice(selectedDayRevenue)}</p>
                                                        <p className="text-[10px] text-slate-500">Pendapatan</p>
                                                    </div>
                                                </div>

                                                {/* Day Item Summary */}
                                                {selectedDayItems.length > 0 && (
                                                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                                        <p className="text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">Ringkasan Item</p>
                                                        <div className="space-y-1.5">
                                                            {selectedDayItems.map((item) => (
                                                                <div key={item.name} className="flex items-center justify-between text-xs">
                                                                    <span className="text-slate-700 truncate flex-1 mr-2">{item.name}</span>
                                                                    <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">{item.qty}×</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Day Orders List */}
                                                <div className="space-y-2">
                                                    {selectedDayOrders.map((order) => (
                                                        <div key={order.id} className="bg-slate-50 rounded-lg p-2.5">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs font-semibold text-secondary">Meja #{order.tableNumber || '?'}</span>
                                                                    <Badge status={order.status} />
                                                                </div>
                                                                <span className="text-xs font-bold text-primary">{formatPrice(order.totalPrice)}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {order.items?.map((item, idx) => (
                                                                    <span key={idx} className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-border">
                                                                        {item.name} ×{item.quantity}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-1">{formatTime(order.createdAt)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
