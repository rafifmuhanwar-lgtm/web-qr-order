import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getCategoriesByStore, addCategory, updateCategory, deleteCategory } from '../../services/categoryService';
import { getStore, updateStore } from '../../services/storeService';
import { uploadMenuImage } from '../../services/menuService';
import { Plus, Pencil, Trash2, FolderOpen, GripVertical, Upload, X, ImageIcon } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function CategoryPage() {
    const { storeId } = useAuth();
    const [categories, setCategories] = useState([]);
    const [categoryBanners, setCategoryBanners] = useState({});
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '', order: 0, bannerUrl: '' });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [catData, storeData] = await Promise.all([
                getCategoriesByStore(storeId),
                getStore(storeId),
            ]);
            setCategories(catData);
            if (storeData?.categoryBanners) {
                setCategoryBanners(storeData.categoryBanners);
            }
        } catch {
            toast.error('Gagal memuat kategori');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        if (storeId) fetchData();
    }, [storeId, fetchData]);

    const openAdd = () => {
        setForm({ name: '', order: categories.length, bannerUrl: '' });
        setEditingId(null);
        setModalOpen(true);
    };

    const openEdit = (cat) => {
        setForm({
            name: cat.name,
            order: cat.order || 0,
            bannerUrl: categoryBanners[cat.id] || '',
        });
        setEditingId(cat.id);
        setModalOpen(true);
    };

    const handleUploadBanner = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingBanner(true);
        try {
            const url = await uploadMenuImage(file);
            setForm((prev) => ({ ...prev, bannerUrl: url }));
            toast.success('Foto banner kategori berhasil diunggah');
        } catch {
            toast.error('Gagal mengunggah banner kategori');
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleSave = async () => {
        if (!form.name) {
            toast.error('Nama kategori wajib diisi');
            return;
        }
        setSaving(true);
        try {
            const data = { storeId, name: form.name, order: Number(form.order) };
            let targetId = editingId;

            if (editingId) {
                await updateCategory(editingId, data);
                toast.success('Kategori diperbarui');
            } else {
                targetId = await addCategory(data);
                toast.success('Kategori ditambahkan');
            }

            // Simpan mapping banner kategori ke setting toko
            if (targetId) {
                const updatedBanners = { ...categoryBanners };
                if (form.bannerUrl) {
                    updatedBanners[targetId] = form.bannerUrl;
                } else {
                    delete updatedBanners[targetId];
                }
                setCategoryBanners(updatedBanners);
                await updateStore(storeId, { categoryBanners: updatedBanners });
            }

            setModalOpen(false);
            fetchData();
        } catch {
            toast.error('Gagal menyimpan kategori');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Hapus kategori "${name}"?`)) return;
        try {
            await deleteCategory(id);
            if (categoryBanners[id]) {
                const updatedBanners = { ...categoryBanners };
                delete updatedBanners[id];
                setCategoryBanners(updatedBanners);
                await updateStore(storeId, { categoryBanners: updatedBanners });
            }
            toast.success('Kategori dihapus');
            fetchData();
        } catch {
            toast.error('Gagal menghapus');
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-secondary">Kategori Menu</h1>
                    <p className="text-slate-500 text-sm">
                        {categories.length} kategori • Atur nama dan foto banner utama per kategori
                    </p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="w-4 h-4" /> Tambah Kategori
                </Button>
            </div>

            {categories.length === 0 ? (
                <EmptyState
                    icon={FolderOpen}
                    title="Belum ada kategori"
                    description="Tambahkan kategori untuk mengelompokkan menu dan menampilkan banner modern"
                />
            ) : (
                <div className="bg-white rounded-2xl border border-border shadow-sm divide-y divide-border">
                    {categories.map((cat) => {
                        const bannerUrl = categoryBanners[cat.id];
                        return (
                            <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3.5">
                                    <GripVertical className="w-4 h-4 text-slate-300" />
                                    {bannerUrl ? (
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-border bg-slate-100 shadow-xs shrink-0">
                                            <img
                                                src={bannerUrl}
                                                alt={cat.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-primary shrink-0">
                                            <FolderOpen className="w-6 h-6" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-secondary text-sm">{cat.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-slate-400">Urutan: {cat.order || 0}</span>
                                            {bannerUrl ? (
                                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                    Banner Kustom Aktif
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    Auto Foto Menu
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEdit(cat)}
                                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
                                        title="Edit Kategori & Banner"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id, cat.name)}
                                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer transition-colors"
                                        title="Hapus Kategori"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Tambah / Edit Kategori */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Kategori & Banner' : 'Tambah Kategori'} size="sm">
                <div className="space-y-4">
                    <Input
                        label="Nama Kategori"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Contoh: Makanan Berat, Minuman, Dessert..."
                    />
                    <Input
                        label="Urutan Tampilan"
                        type="number"
                        value={form.order}
                        onChange={(e) => setForm({ ...form, order: e.target.value })}
                        placeholder="0"
                    />

                    {/* Upload Banner Khusus Kategori */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-primary" />
                            <span>Foto Banner Kategori (Gaya Foto 2)</span>
                        </label>

                        {form.bannerUrl ? (
                            <div className="relative rounded-2xl overflow-hidden border border-border bg-slate-50 group">
                                <img
                                    src={form.bannerUrl}
                                    alt="Banner Kategori"
                                    className="w-full h-36 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setForm((prev) => ({ ...prev, bannerUrl: '' }))}
                                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-md hover:bg-red-700 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" /> Hapus Foto
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all p-3 text-center">
                                {uploadingBanner ? (
                                    <div className="text-center">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1.5" />
                                        <p className="text-xs text-slate-500">Mengupload banner...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                                        <p className="text-xs font-semibold text-slate-700">Upload Foto Banner Kategori</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Opsional. Jika kosong, sistem otomatis mengambil foto menu pertama.
                                        </p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleUploadBanner}
                                    disabled={uploadingBanner}
                                />
                            </label>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                            💡 Foto ini akan tampil sebagai gambar andalan di sisi kanan kartu banner kategori pelanggan (Frameless & Modern).
                        </p>
                    </div>

                    <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                        <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">
                            Batal
                        </Button>
                        <Button onClick={handleSave} loading={saving} className="flex-1">
                            {editingId ? 'Perbarui' : 'Simpan'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
