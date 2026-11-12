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
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menu' },
    { to: '/admin/categories', icon: FolderOpen, label: 'Kategori' },
    { to: '/admin/tables', icon: Store, label: 'Meja' },
    { to: '/admin/online-qr', icon: QrCode, label: 'QR Pesan Online' },
    { to: '/admin/orders', icon: ClipboardList, label: 'Pesanan' },
    { to: '/admin/reports', icon: BarChart3, label: 'Laporan' },
    { to: '/admin/settings', icon: Settings, label: 'Pengaturan' },
];

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, storeData } = useAuth();
    const navigate = useNavigate();
    const storeName = storeData?.name || 'Admin Panel';

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
        fixed top-0 left-0 bottom-0 z-50 w-64 bg-secondary
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
                <div className="flex items-center justify-between p-5 border-b border-white/10">
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

                <nav className="p-3 space-y-1 mt-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                }
              `}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
                    <div className="px-4 py-2 mb-2">
                        <p className="text-white text-sm font-medium truncate">{user?.email}</p>
                        <p className="text-slate-400 text-xs">Administrator</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium
              text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                        <LogOut className="w-5 h-5" />
                        Keluar
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
