import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithEmail, registerAdmin } from '../../services/authService';
import { ChefHat, Mail, Lock, Store } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', storeName: '' });

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
            const msg = err.code === 'auth/user-not-found' ? 'User tidak ditemukan'
                : err.code === 'auth/wrong-password' ? 'Password salah'
                    : err.code === 'auth/email-already-in-use' ? 'Email sudah terdaftar'
                        : err.code === 'auth/weak-password' ? 'Password minimal 6 karakter'
                            : 'Terjadi kesalahan';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                        <ChefHat className="w-9 h-9 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">WEB ORDER ONLINE</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {isRegister ? 'Buat akun baru untuk toko Anda' : 'Masuk ke dashboard admin'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700">Nama Toko</label>
                                <div className="relative">
                                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={form.storeName}
                                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                                        placeholder="Nama toko Anda"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm
                      focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="admin@gmail.com"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm
                    focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-sm
                    focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>
                        </div>

                        <Button type="submit" loading={loading} size="lg" className="w-full">
                            {isRegister ? 'Daftar & Buat Toko' : 'Masuk'}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-sm text-primary hover:text-primary-dark font-medium cursor-pointer"
                        >
                            {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
