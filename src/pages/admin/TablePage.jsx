import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getTablesByStore, addTable, deleteTable, generateQRUrl, padTableNumber } from '../../services/tableService';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Trash2, QrCode, Download, Copy } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function TablePage() {
    const { storeId } = useAuth();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addModal, setAddModal] = useState(false);
    const [qrModal, setQrModal] = useState(null);
    const [tableNumber, setTableNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const qrRef = useRef();

    const fetchData = async () => {
        try {
            const data = await getTablesByStore(storeId);
            setTables(data);
        } catch {
            toast.error('Gagal memuat data meja');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (storeId) fetchData();
    }, [storeId]);

    const handleAdd = async () => {
        if (!tableNumber) {
            toast.error('Nomor meja wajib diisi');
            return;
        }
        setSaving(true);
        try {
            await addTable({ storeId, number: Number(tableNumber) });
            toast.success('Meja berhasil ditambahkan');
            setAddModal(false);
            setTableNumber('');
            fetchData();
        } catch {
            toast.error('Gagal menambah meja');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, number) => {
        if (!confirm(`Hapus Meja #${padTableNumber(number)}?`)) return;
        try {
            await deleteTable(id);
            toast.success('Meja dihapus');
            fetchData();
        } catch {
            toast.error('Gagal menghapus meja');
        }
    };

    const downloadQR = (table) => {
        const svg = document.getElementById(`qr-${table.id}`);
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);
            ctx.drawImage(img, 56, 56, 400, 400);
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 28px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Meja #${padTableNumber(table.number)}`, 256, 490);
            const link = document.createElement('a');
            link.download = `QR-Meja-${padTableNumber(table.number)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const copyUrl = (table) => {
        const url = generateQRUrl(storeId, table.number);
        navigator.clipboard.writeText(url);
        toast.success('URL disalin!');
    };

    if (loading) return <Spinner />;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-secondary">Meja & QR Code</h1>
                    <p className="text-slate-500 text-sm">{tables.length} meja terdaftar</p>
                </div>
                <Button onClick={() => setAddModal(true)}>
                    <Plus className="w-4 h-4" /> Tambah Meja
                </Button>
            </div>

            {tables.length === 0 ? (
                <EmptyState icon={QrCode} title="Belum ada meja" description="Tambahkan meja dan generate QR Code" />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tables.map((table) => {
                        const url = generateQRUrl(storeId, table.number);
                        return (
                            <div key={table.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow text-center">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                    <QrCode className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="font-bold text-lg text-secondary mb-3">Meja #{padTableNumber(table.number)}</h3>
                                <div className="flex justify-center mb-4">
                                    <QRCodeSVG
                                        id={`qr-${table.id}`}
                                        value={url}
                                        size={160}
                                        level="H"
                                        fgColor="#1e293b"
                                        bgColor="#ffffff"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mb-4 break-all">{url}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => downloadQR(table)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 cursor-pointer"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Download
                                    </button>
                                    <button
                                        onClick={() => copyUrl(table)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 cursor-pointer"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> Salin URL
                                    </button>
                                    <button
                                        onClick={() => handleDelete(table.id, table.number)}
                                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Table Modal */}
            <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Tambah Meja" size="sm">
                <div className="space-y-4">
                    <Input
                        label="Nomor Meja"
                        type="number"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="1"
                    />
                    <div className="flex gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setAddModal(false)} className="flex-1">Batal</Button>
                        <Button onClick={handleAdd} loading={saving} className="flex-1">Simpan</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
