import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { logout } from '../../services/authService';
import {
    LayoutDashboard,
    UtensilsCrossed,
    FolderOpen,
    QrCode,
    Store,
    ClipboardList,
    BarChart3,
    LogOut,
    Menu,
    X,
    ChefHat,
    Settings,
    Shield,
    MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menu' },
    { to: '/admin/categories', icon: FolderOpen, label: 'Kategori' },
    { to: '/admin/tables', icon: Store, label: 'Meja' },
    { to: '/admin/online-qr', icon: QrCode, label: 'QR Pesan Online' },
    { to: '/admin/orders', icon: ClipboardList, label: 'Pesanan' },
    { to: '/admin/chats', icon: MessageSquare, label: 'Live Chat' },
    { to: '/admin/reports', icon: BarChart3, label: 'Laporan' },
    { to: '/admin/settings', icon: Settings, label: 'Pengaturan' },
];

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, userData, storeData } = useAuth();
    const navigate = useNavigate();
    const storeName = storeData?.name || 'Admin Panel';
    const isMaster = user?.email === 'rafif.muh.anwar@gmail.com' || userData?.role === 'master_admin';

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Berhasil keluar');
            navigate('/admin/login');
        } catch {
            toast.error('Gagal keluar');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-border">
                <div className="flex items-center justify-between px-4 h-14">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                        <Menu className="w-5 h-5 text-slate-700" />
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" className="w-7 h-7 object-contain rounded-lg" alt="eMakan" />
                        <span className="font-bold text-secondary truncate max-w-[160px]">{storeName}</span>
                    </div>
                    <div className="w-9" />
                </div>
            </header>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
                    <div className="absolute inset-0 bg-black/50" />
                </div>
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-secondary flex flex-col justify-between
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
                {/* Brand Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" className="w-10 h-10 object-contain rounded-xl shadow-md" alt="eMakan" />
                        <div>
                            <h1 className="text-white font-bold text-lg truncate">{storeName}</h1>
                            <p className="text-orange-400 font-semibold text-xs">eMakan POS</p>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-white/10 cursor-pointer">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Navigation Items (Scrollable when screen height is small) */}
                <nav className="p-3 space-y-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                    {isMaster && (
                        <div className="mb-2 pb-2 border-b border-white/10">
                            <NavLink
                                to="/master-portal"
                                onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all shadow-md group"
                            >
                                <Shield className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                                <span className="truncate">Portal Master Admin</span>
                                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                                    PRO
                                </span>
                            </NavLink>
                        </div>
                    )}
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium
                transition-all duration-200
                ${isActive
                                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                }
              `}
                        >
                            <item.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User Profile & Logout Footer (Fixed at bottom of flex column, never overlaps) */}
                <div className="p-3 border-t border-white/10 bg-secondary shrink-0">
                    <div className="px-3 py-1.5 mb-1 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-white text-xs font-semibold truncate" title={user?.email}>{user?.email}</p>
                        <p className="text-slate-400 text-[10px]">Administrator</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold
              text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Keluar</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
                <div className="p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
