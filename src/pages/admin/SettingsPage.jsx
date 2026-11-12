import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { THEME_COLORS, COLOR_OPTIONS, applyThemeColor } from '../../utils/themeUtils';
import { getStore, updateStore } from '../../services/storeService';
import { uploadMenuImage } from '../../services/menuService';
import { Store, Palette, Save, Check, Pipette, MessageSquare, Receipt, Upload } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const { storeId, refreshStore } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [storeName, setStoreName] = useState('');
    const [address, setAddress] = useState('');
    const [themeColor, setThemeColor] = useState('orange');
    const [customColor, setCustomColor] = useState('#6366f1');

    // New fields
    const [logoUrl, setLogoUrl] = useState('');
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [receiptFooter, setReceiptFooter] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const data = await getStore(storeId);
                if (data) {
                    setStoreName(data.name || '');
                    setAddress(data.address || '');
                    setThemeColor(data.themeColor || 'orange');
                    setCustomColor(data.customColor || '#6366f1');
                    setLogoUrl(data.logoUrl || '');
                    setWelcomeMessage(data.welcomeMessage || '');
                    setReceiptFooter(data.receiptFooter || '');
                }
            } catch {
                toast.error('Gagal memuat data toko');
            } finally {
                setLoading(false);
            }
        };
        if (storeId) fetchStore();
    }, [storeId]);

    const handleUploadLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const url = await uploadMenuImage(file);
            setLogoUrl(url);
            toast.success('Logo berhasil diupload');
        } catch {
            toast.error('Gagal upload logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateStore(storeId, {
                name: storeName,
                address,
                themeColor,
                customColor: themeColor === 'custom' ? customColor : null,
                logoUrl,
                welcomeMessage,
                receiptFooter,
            });
            await refreshStore();
            toast.success('Pengaturan berhasil disimpan');
        } catch {
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    // Preview theme color on selection (before saving)
    const handleColorSelect = (colorKey) => {
        setThemeColor(colorKey);
        applyThemeColor(colorKey, customColor);
    };

    // Preview custom color on change
    const handleCustomColorChange = (hex) => {
        setCustomColor(hex);
        if (themeColor === 'custom') {
            applyThemeColor('custom', hex);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-secondary">Pengaturan Toko</h1>
                <p className="text-slate-500 text-sm">Kelola informasi toko, pembayaran, dan tampilan</p>
            </div>

            {/* Store Info */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Store className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-secondary">Informasi Toko</h2>
                </div>
                <Input
                    label="Nama Toko"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Nama toko kamu"
                />
                <Input
                    label="Alamat"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Alamat toko"
                />

                {/* Logo Upload */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Logo Toko</label>
                    {logoUrl ? (
                        <div className="flex items-center gap-4">
                            <img
                                src={logoUrl}
                                alt="Logo Toko"
                                className="w-20 h-20 rounded-xl object-cover border border-border shadow-sm"
                            />
                            <div className="space-y-2">
                                <p className="text-xs text-slate-400">Logo akan muncul di halaman menu customer & struk</p>
                                <button
                                    onClick={() => setLogoUrl('')}
                                    className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 cursor-pointer"
                                >
                                    Hapus Logo
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                            {uploadingLogo ? (
                                <div className="text-center">
                                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">Mengupload...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-slate-400 mb-1" />
                                    <p className="text-sm font-medium text-slate-600">Upload Logo Toko</p>
                                    <p className="text-xs text-slate-400 mt-0.5">PNG, JPG (maks 5MB)</p>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUploadLogo}
                                disabled={uploadingLogo}
                            />
                        </label>
                    )}
                </div>
            </div>

            {/* Welcome Message & Receipt Footer */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-secondary">Pesan & Struk</h2>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Pesan Sambutan</label>
                    <textarea
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        placeholder="Contoh: Selamat datang di Toko Gacoan! 🎉"
                        className="w-full p-3 rounded-xl border border-border text-sm resize-none h-16 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        maxLength={100}
                    />
                    <p className="text-xs text-slate-400 mt-1">Muncul di halaman menu customer ({welcomeMessage.length}/100)</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        <Receipt className="w-3.5 h-3.5 inline mr-1" />
                        Footer Struk
                    </label>
                    <textarea
                        value={receiptFooter}
                        onChange={(e) => setReceiptFooter(e.target.value)}
                        placeholder="Contoh: Promo 10% setiap hari Jumat! 🎁"
                        className="w-full p-3 rounded-xl border border-border text-sm resize-none h-16 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        maxLength={120}
                    />
                    <p className="text-xs text-slate-400 mt-1">Teks kustom di bagian bawah struk ({receiptFooter.length}/120)</p>
                </div>
            </div>

            {/* Theme Color */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-secondary">Warna Tema</h2>
                </div>
                <p className="text-sm text-slate-500">
                    Pilih warna utama untuk tampilan website toko kamu. Warna ini juga akan terlihat oleh customer.
                </p>

                {/* Preset Colors */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {COLOR_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            onClick={() => handleColorSelect(option.key)}
                            className="group flex flex-col items-center gap-1.5 cursor-pointer"
                            title={option.label}
                        >
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:scale-110
                                    ${themeColor === option.key
                                        ? 'ring-3 ring-offset-2 ring-slate-400 scale-110'
                                        : 'hover:shadow-lg'
                                    }`}
                                style={{ backgroundColor: option.color }}
                            >
                                {themeColor === option.key && (
                                    <Check className="w-5 h-5 text-white drop-shadow-md" />
                                )}
                            </div>
                            <span className={`text-xs font-medium transition-colors
                                ${themeColor === option.key ? 'text-secondary' : 'text-slate-400'}`}>
                                {option.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Custom Color Picker */}
                <div className="border-t border-border pt-4 mt-2">
                    <button
                        onClick={() => handleColorSelect('custom')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer
                            ${themeColor === 'custom'
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-slate-300'
                            }`}
                    >
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md flex-shrink-0 transition-all
                                ${themeColor === 'custom' ? 'ring-3 ring-offset-2 ring-slate-400' : ''}`}
                            style={{ backgroundColor: customColor }}
                        >
                            {themeColor === 'custom' ? (
                                <Check className="w-5 h-5 text-white drop-shadow-md" />
                            ) : (
                                <Pipette className="w-5 h-5 text-white drop-shadow-md" />
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <p className={`text-sm font-semibold ${themeColor === 'custom' ? 'text-secondary' : 'text-slate-600'}`}>
                                Warna Custom
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">Pilih warna sesuai keinginanmu</p>
                        </div>
                    </button>

                    {themeColor === 'custom' && (
                        <div className="mt-3 flex items-center gap-4 p-4 bg-slate-50 rounded-xl animate-fade-in">
                            <label className="relative cursor-pointer group">
                                <input
                                    type="color"
                                    value={customColor}
                                    onChange={(e) => handleCustomColorChange(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div
                                    className="w-14 h-14 rounded-xl shadow-lg group-hover:scale-105 transition-transform border-2 border-white"
                                    style={{ backgroundColor: customColor }}
                                />
                            </label>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Kode Warna (HEX)</label>
                                <input
                                    type="text"
                                    value={customColor}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                            setCustomColor(val);
                                            if (val.length === 7) {
                                                handleCustomColorChange(val);
                                            }
                                        }
                                    }}
                                    placeholder="#6366f1"
                                    className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono
                                        focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    maxLength={7}
                                />
                            </div>
                            <div
                                className="hidden sm:flex flex-col gap-1 items-center"
                            >
                                <div className="w-8 h-8 rounded-lg shadow-sm border border-border" style={{ backgroundColor: customColor }} />
                                <span className="text-[10px] text-slate-400">Preview</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} loading={saving} className="w-full">
                <Save className="w-4 h-4" /> Simpan Pengaturan
            </Button>
        </div>
    );
}
