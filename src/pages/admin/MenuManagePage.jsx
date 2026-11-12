import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMenusByStore, addMenu, updateMenu, deleteMenu, uploadMenuImage } from '../../services/menuService';
import { getCategoriesByStore } from '../../services/categoryService';
import { Plus, Pencil, Trash2, ImagePlus, UtensilsCrossed } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const initialForm = { name: '', price: '', description: '', categoryId: '', isAvailable: true, imageUrl: '' };

export default function MenuManagePage() {
    const { storeId } = useAuth();
    const [menus, setMenus] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [menuData, catData] = await Promise.all([
                getMenusByStore(storeId),
                getCategoriesByStore(storeId),
            ]);
            setMenus(menuData);
            setCategories(catData);
        } catch {
            toast.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        if (storeId) fetchData();
    }, [storeId, fetchData]);

    const openAdd = () => {
        setForm(initialForm);
        setEditingId(null);
        setModalOpen(true);
    };

    const openEdit = (menu) => {
        setForm({
            name: menu.name,
            price: menu.price.toString(),
            description: menu.description || '',
            categoryId: menu.categoryId || '',
            isAvailable: menu.isAvailable !== false,
            imageUrl: menu.imageUrl || menu.image || '',
        });
        setEditingId(menu.id);
        setModalOpen(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ukuran file maks 2MB');
            return;
        }
        setUploading(true);
        try {
            const url = await uploadMenuImage(file);
            setForm((prev) => ({ ...prev, imageUrl: url }));
            toast.success('Foto berhasil diupload');
        } catch {
            toast.error('Gagal upload foto');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.price) {
            toast.error('Nama dan harga wajib diisi');
            return;
        }
        setSaving(true);
        try {
            const data = {
                storeId,
                name: form.name,
                price: Number(form.price),
                description: form.description,
                categoryId: form.categoryId || null,
                isAvailable: form.isAvailable,
                imageUrl: form.imageUrl,
            };

            if (editingId) {
                await updateMenu(editingId, data);
                toast.success('Menu diperbarui');
            } else {
                await addMenu(data);
                toast.success('Menu ditambahkan');
            }
            setModalOpen(false);
            fetchData();
        } catch {
            toast.error('Gagal menyimpan menu');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Hapus menu "${name}"?`)) return;
        try {
            await deleteMenu(id);
            toast.success('Menu dihapus');
            fetchData();
        } catch {
            toast.error('Gagal menghapus menu');
        }
    };

    const toggleAvailability = async (menu) => {
        try {
            await updateMenu(menu.id, { isAvailable: !menu.isAvailable });
            toast.success(menu.isAvailable ? 'Menu dinonaktifkan' : 'Menu diaktifkan');
            fetchData();
        } catch {
            toast.error('Gagal mengubah status');
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    if (loading) return <Spinner />;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-secondary">Manajemen Menu</h1>
                    <p className="text-slate-500 text-sm">{menus.length} menu terdaftar</p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="w-4 h-4" /> Tambah Menu
                </Button>
            </div>

            {menus.length === 0 ? (
                <EmptyState icon={UtensilsCrossed} title="Belum ada menu" description="Tambahkan menu pertama Anda" />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {menus.map((menu) => (
                        <div key={menu.id} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                {menu.imageUrl ? (
                                    <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <UtensilsCrossed className="w-10 h-10 text-slate-300" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge status={menu.isAvailable !== false ? 'available' : 'unavailable'} />
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-secondary">{menu.name}</h3>
                                <p className="text-primary font-bold mt-1">{formatPrice(menu.price)}</p>
                                {menu.description && (
                                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">{menu.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-4">
                                    <button
                                        onClick={() => toggleAvailability(menu)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors
                      ${menu.isAvailable !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                    >
                                        {menu.isAvailable !== false ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                    <button onClick={() => openEdit(menu)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer">
                                        <Pencil className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <button onClick={() => handleDelete(menu.id, menu.name)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 cursor-pointer">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Menu' : 'Tambah Menu'}>
                <div className="space-y-4">
                    <Input
                        label="Nama Menu"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Nasi Goreng"
                    />
                    <Input
                        label="Harga (Rp)"
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="25000"
                    />
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">Kategori</label>
                        <select
                            value={form.categoryId}
                            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="">Pilih Kategori</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">Deskripsi</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Deskripsi singkat menu..."
                            className="w-full p-3 rounded-xl border border-border text-sm resize-none h-20 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">Foto Menu</label>
                        {form.imageUrl && (
                            <img src={form.imageUrl} alt="preview" className="w-full h-32 object-cover rounded-xl mb-2" />
                        )}
                        <label className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/30 cursor-pointer transition-colors">
                            <ImagePlus className="w-5 h-5 text-slate-400" />
                            <span className="text-sm text-slate-500">{uploading ? 'Mengupload...' : 'Pilih foto (maks 2MB)'}</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="available"
                            checked={form.isAvailable}
                            onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                            className="w-4 h-4 accent-primary"
                        />
                        <label htmlFor="available" className="text-sm text-slate-700">Tersedia / Aktif</label>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Batal</Button>
                        <Button onClick={handleSave} loading={saving} className="flex-1">
                            {editingId ? 'Perbarui' : 'Simpan'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
