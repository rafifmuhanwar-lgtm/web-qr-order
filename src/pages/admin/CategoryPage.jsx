import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getCategoriesByStore, addCategory, updateCategory, deleteCategory } from '../../services/categoryService';
import { Plus, Pencil, Trash2, FolderOpen, GripVertical } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function CategoryPage() {
    const { storeId } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '', order: 0 });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const data = await getCategoriesByStore(storeId);
            setCategories(data);
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
        setForm({ name: '', order: categories.length });
        setEditingId(null);
        setModalOpen(true);
    };

    const openEdit = (cat) => {
        setForm({ name: cat.name, order: cat.order || 0 });
        setEditingId(cat.id);
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name) {
            toast.error('Nama kategori wajib diisi');
            return;
        }
        setSaving(true);
        try {
            const data = { storeId, name: form.name, order: Number(form.order) };
            if (editingId) {
                await updateCategory(editingId, data);
                toast.success('Kategori diperbarui');
            } else {
                await addCategory(data);
                toast.success('Kategori ditambahkan');
            }
            setModalOpen(false);
            fetchData();
        } catch {
            toast.error('Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Hapus kategori "${name}"?`)) return;
        try {
            await deleteCategory(id);
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
                    <p className="text-slate-500 text-sm">{categories.length} kategori</p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="w-4 h-4" /> Tambah
                </Button>
            </div>

            {categories.length === 0 ? (
                <EmptyState icon={FolderOpen} title="Belum ada kategori" description="Tambahkan kategori untuk mengelompokkan menu" />
            ) : (
                <div className="bg-white rounded-2xl border border-border shadow-sm divide-y divide-border">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <GripVertical className="w-4 h-4 text-slate-300" />
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <FolderOpen className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-secondary">{cat.name}</p>
                                    <p className="text-xs text-slate-400">Urutan: {cat.order || 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                                    <Pencil className="w-4 h-4 text-slate-500" />
                                </button>
                                <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 rounded-lg hover:bg-red-50 cursor-pointer">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Kategori' : 'Tambah Kategori'} size="sm">
                <div className="space-y-4">
                    <Input
                        label="Nama Kategori"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Makanan, Minuman, dll"
                    />
                    <Input
                        label="Urutan"
                        type="number"
                        value={form.order}
                        onChange={(e) => setForm({ ...form, order: e.target.value })}
                        placeholder="0"
                    />
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
