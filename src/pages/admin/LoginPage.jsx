import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithEmail, registerAdmin, loginWithGoogle } from '../../services/authService';
import { Mail, Lock, Store, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', storeName: '' });

    const handleGoogleAuth = async () => {
        setGoogleLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            toast.error(err?.message || 'Gagal login dengan Google');
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            toast.error('Email dan password wajib diisi');
            return;
        }
        if (isRegister && !form.storeName) {
            toast.error('Nama toko wajib diisi');
            return;
        }

        setLoading(true);
        try {
            if (isRegister) {
                await registerAdmin(form.email, form.password, form.storeName);
                toast.success('Registrasi berhasil!');
            } else {
                await loginWithEmail(form.email, form.password);
                toast.success('Login berhasil!');
            }
            navigate('/admin');
        } catch (err) {
            let msg = err?.message || 'Terjadi kesalahan';
            if (msg.includes('Invalid login credentials')) {
                msg = 'Email atau password salah';
            } else if (msg.includes('already registered') || msg.includes('already in use')) {
                msg = 'Email sudah terdaftar';
            } else if (msg.includes('at least 6 characters') || msg.includes('weak-password')) {
                msg = 'Password minimal 6 karakter';
            }
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
            <div className="w-full max-w-md">
                {/* Back to Home Link */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-orange-400 transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Beranda eMakan</span>
                </Link>

                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <img
                        src="/logo.png"
                        alt="eMakan Logo"
                        className="w-16 h-16 object-contain rounded-2xl mx-auto mb-4 shadow-xl shadow-orange-500/20"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tight">eMakan Admin POS</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {isRegister ? 'Daftarkan toko baru Anda' : 'Masuk ke dashboard kelola toko'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100">
                    {/* Google One-Click Auth */}
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={handleGoogleAuth}
                            disabled={googleLoading}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-sm transition-all cursor-pointer hover:border-slate-300 active:scale-[0.99] disabled:opacity-70"
                        >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>{googleLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}</span>
                        </button>
                        <p className="text-[11px] text-center text-slate-400">
                            Paling cepat & otomatis membuat akun toko
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="relative my-6 text-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <span className="relative bg-white px-3 text-xs text-slate-400 font-medium uppercase">
                            atau email
                        </span>
                    </div>

                    {!showEmailForm ? (
                        <button
                            type="button"
                            onClick={() => setShowEmailForm(true)}
                            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 text-xs font-semibold transition-all cursor-pointer text-center"
                        >
                            Masuk menggunakan Email & Password
                        </button>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                            {isRegister && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">Nama Toko / Resto</label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={form.storeName}
                                            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                                            placeholder="Contoh: Warkop eMakan"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-700">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="admin@email.com"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-700">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                    />
                                </div>
                            </div>

                            <Button type="submit" loading={loading} size="lg" className="w-full">
                                {isRegister ? 'Daftar & Buat Toko' : 'Masuk'}
                            </Button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRegister(!isRegister)}
                                    className="text-xs text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
                                >
                                    {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Buat Baru'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
