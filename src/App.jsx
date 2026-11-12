import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Spinner from './components/ui/Spinner';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import CustomerLayout from './components/layout/CustomerLayout';

// Customer Pages
import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import OrderStatusPage from './pages/customer/OrderStatusPage';

// Admin Pages
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import MenuManagePage from './pages/admin/MenuManagePage';
import CategoryPage from './pages/admin/CategoryPage';
import TablePage from './pages/admin/TablePage';
import OnlineQrPage from './pages/admin/OnlineQrPage';
import OrderPage from './pages/admin/OrderPage';
import ReportPage from './pages/admin/ReportPage';
import SettingsPage from './pages/admin/SettingsPage';
import LandingPage from './pages/LandingPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner text="Memverifikasi..." />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Customer Routes */}
      <Route element={<CustomerLayout />}>
        {/* QR Meja (Dine In) */}
        <Route path="/order/:storeId/:tableId" element={<MenuPage />} />
        <Route path="/order/:storeId/:tableId/cart" element={<CartPage />} />
        {/* Order Online / Dari Rumah */}
        <Route path="/order/:storeId" element={<MenuPage />} />
        <Route path="/order/:storeId/cart" element={<CartPage />} />
        <Route path="/order-status/:orderId" element={<OrderStatusPage />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="menu" element={<MenuManagePage />} />
        <Route path="categories" element={<CategoryPage />} />
        <Route path="tables" element={<TablePage />} />
        <Route path="online-qr" element={<OnlineQrPage />} />
        <Route path="orders" element={<OrderPage />} />
        <Route path="reports" element={<ReportPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-slate-300 mb-4">404</h1>
            <p className="text-slate-500 mb-4">Halaman tidak ditemukan</p>
            <a href="/" className="text-primary hover:text-primary-dark font-medium">Kembali</a>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              background: '#1e293b',
              color: '#fff',
              fontSize: '14px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
