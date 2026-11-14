import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { THEME_COLORS, COLOR_OPTIONS, applyThemeColor } from '../../utils/themeUtils';
import { parseStoreConfig } from '../../utils/deliveryUtils';
import { getStore, updateStore } from '../../services/storeService';
import { uploadMenuImage } from '../../services/menuService';
import { Store, Palette, Save, Check, Pipette, MessageSquare, Receipt, Upload, Bike, MapPin, Phone } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import MapPicker from '../../components/ui/MapPicker';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const { storeId, refreshStore } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [storeName, setStoreName] = useState('');
    const [address, setAddress] = useState('');
    const [themeColor, setThemeColor] = useState('orange');
    const [customColor, setCustomColor] = useState('#6366f1');

    // Delivery & Location settings
    const [storeLat, setStoreLat] = useState(-6.2088);
    const [storeLng, setStoreLng] = useState(106.8456);
    const [freeDistanceKm, setFreeDistanceKm] = useState('5');
    const [feePerKm, setFeePerKm] = useState('2500');
    const [maxDistanceKm, setMaxDistanceKm] = useState('15');
    const [whatsapp, setWhatsapp] = useState('');

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
                    setThemeColor(data.themeColor || 'orange');
                    setCustomColor(data.customColor || '#6366f1');
                    setLogoUrl(data.logoUrl || '');
                    setWelcomeMessage(data.welcomeMessage || '');
                    setReceiptFooter(data.receiptFooter || '');

                    const cfg = parseStoreConfig(data);
                    setAddress(cfg.address || '');
                    if (cfg.lat) setStoreLat(cfg.lat);
                    if (cfg.lng) setStoreLng(cfg.lng);
                    setFreeDistanceKm(String(cfg.freeDistanceKm ?? 5));
                    setFeePerKm(String(cfg.feePerKm ?? 2500));
                    setMaxDistanceKm(String(cfg.maxDistanceKm ?? 15));
                    setWhatsapp(cfg.whatsapp || '');
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
            const deliveryConfig = {
                address,
                lat: storeLat,
                lng: storeLng,
                freeDistanceKm: Number(freeDistanceKm) || 0,
                feePerKm: Number(feePerKm) || 0,
                maxDistanceKm: Number(maxDistanceKm) || 15,
                whatsapp,
                themeColor,
                customColor: themeColor === 'custom' ? customColor : null,
                welcomeMessage,
                receiptFooter,
            };

            await updateStore(storeId, {
                name: storeName,
                address: JSON.stringify(deliveryConfig),
                logoUrl,
                themeColor,
                customColor: themeColor === 'custom' ? customColor : null,
                welcomeMessage,
                receiptFooter,
            });
            await refreshStore();
            toast.success('Pengaturan toko & lokasi berhasil disimpan! ✅');
        } catch (err) {
            console.error('Save settings error:', err);
            toast.error(err.message || 'Gagal menyimpan pengaturan');
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

            {/* Delivery & Map Settings */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <Bike className="w-5 h-5 text-primary" />
                    <div>
                        <h2 className="font-bold text-secondary">Lokasi Resto & Aturan Ongkos Kirim</h2>
                        <p className="text-xs text-slate-400">Tentukan titik resto dan skema tarif delivery mandiri</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" /> Titik Peta Resto (Untuk Menghitung Jarak Pelanggan)
                    </label>
                    <MapPicker
                        initialLat={storeLat}
                        initialLng={storeLng}
                        onLocationSelect={({ lat, lng, address: addr }) => {
                            setStoreLat(lat);
                            setStoreLng(lng);
                            if (addr) setAddress(addr);
                        }}
                        height="240px"
                    />

                    {/* Live Selected Address Feedback Box */}
                    <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-start justify-between gap-3 text-xs">
                        <div className="flex-1 space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Alamat & Titik Resto Terpilih:
                            </span>
                            <p className="font-semibold text-slate-800 leading-snug">
                                {address || 'Geser pin atau klik "Lokasi Saya" untuk mendeteksi alamat'}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono pt-0.5">
                                Koordinat: {storeLat.toFixed(5)}, {storeLng.toFixed(5)}
                            </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                            ✓ Siap Disimpan
                        </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                        Geser pin atau klik &apos;Lokasi Saya&apos; agar sistem mengetahui titik awal pengantaran resto.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <Input
                        label="Nomor WhatsApp Resto"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        helperText="Untuk pelanggan menghubungi pihak resto via WhatsApp"
                    />
                    <Input
                        label="Batas Jarak Gratis Ongkir (Km)"
                        type="number"
                        min="0"
                        value={freeDistanceKm}
                        onChange={(e) => setFreeDistanceKm(e.target.value)}
                        placeholder="5"
                        helperText="Misal 5 Km: Jarak 0 - 5 km gratis ongkir"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Tarif Ongkir per Km Tambahan (Rp)"
                        type="number"
                        min="0"
                        step="500"
                        value={feePerKm}
                        onChange={(e) => setFeePerKm(e.target.value)}
                        placeholder="2500"
                        helperText="Dikenakan per km jika melebihi batas gratis"
                    />
                    <Input
                        label="Jangkauan Maksimal Pengantaran (Km)"
                        type="number"
                        min="1"
                        value={maxDistanceKm}
                        onChange={(e) => setMaxDistanceKm(e.target.value)}
                        placeholder="15"
                        helperText="Order delivery ditolak jika melebihi batas ini"
                    />
                </div>

                <div className="bg-orange-50/70 border border-orange-200/60 rounded-xl p-3 text-xs text-orange-950">
                    <span className="font-bold">Ringkasan Skema:</span> Pengantaran dalam jarak{' '}
                    <span className="font-semibold text-orange-600">0 - {freeDistanceKm || 0} km</span>{' '}
                    gratis (Rp 0). Di atas {freeDistanceKm || 0} km dikenakan{' '}
                    <span className="font-semibold text-orange-600">
                        Rp {Number(feePerKm || 0).toLocaleString('id-ID')}/km
                    </span>
                    . Jangkauan antar maksimal <span className="font-semibold text-orange-600">{maxDistanceKm || 15} km</span>.
                </div>

                <div className="pt-1 flex justify-end">
                    <Button onClick={handleSave} loading={saving} size="sm" variant="outline">
                        <Save className="w-3.5 h-3.5" /> Simpan Lokasi & Ongkir
                    </Button>
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
