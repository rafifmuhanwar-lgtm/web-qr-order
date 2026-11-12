import { useAuth } from '../../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Copy, ExternalLink, Share2, Smartphone, ShoppingBag, Bike } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function OnlineQrPage() {
    const { storeId, storeData } = useAuth();
    const storeName = storeData?.name || 'Resto eMakan';
    const storeUrl = `${window.location.origin}/order/${storeId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(storeUrl);
        toast.success('Link toko berhasil disalin!');
    };

    const downloadPoster = () => {
        const svg = document.getElementById('online-qr-svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.onload = () => {
            // Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 600, 800);

            // Header Banner
            ctx.fillStyle = '#f97316';
            ctx.fillRect(0, 0, 600, 160);

            // Header Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(storeName, 300, 70);

            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.fillText('PESAN ONLINE · TAKE AWAY & DELIVERY', 300, 115);

            // QR Code in Center
            ctx.drawImage(img, 120, 220, 360, 360);

            // Subtitle
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 22px Inter, sans-serif';
            ctx.fillText('Scan Kamera HP untuk Pesan', 300, 630);

            ctx.fillStyle = '#64748b';
            ctx.font = '16px Inter, sans-serif';
            ctx.fillText('Tanpa Perlu Instal Aplikasi', 300, 665);

            // Footer URL
            ctx.fillStyle = '#f97316';
            ctx.font = 'bold 15px monospace';
            ctx.fillText(storeUrl, 300, 740);

            const link = document.createElement('a');
            link.download = `QR-Pesan-Online-${storeName.replace(/\s+/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Poster QR berhasil diunduh!');
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-secondary">QR & Link Pesan Online</h1>
                <p className="text-slate-500 text-sm mt-0.5">
                    Gunakan QR Code dan tautan ini untuk pelanggan yang ingin memesan dari rumah (Ambil Sendiri / Delivery).
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Card: QR Preview */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-border p-6 shadow-xs text-center space-y-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <QrCode className="w-6 h-6" />
                    </div>

                    <div>
                        <h3 className="font-bold text-lg text-secondary">{storeName}</h3>
                        <p className="text-xs text-slate-400">QR Resmi Pemesanan Mandiri</p>
                    </div>

                    {/* QR Code Container */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-center">
                        <QRCodeSVG
                            id="online-qr-svg"
                            value={storeUrl}
                            size={220}
                            level="H"
                            fgColor="#0f172a"
                            bgColor="#f8fafc"
                        />
                    </div>

                    <div className="space-y-2 pt-2">
                        <Button onClick={downloadPoster} className="w-full justify-center">
                            <Download className="w-4 h-4" /> Unduh Poster QR Siap Cetak
                        </Button>
                        <p className="text-[11px] text-slate-400">
                            Format gambar resolusi tinggi siap dipasang di kasir, standing banner, atau dibagikan ke pelanggan.
                        </p>
                    </div>
                </div>

                {/* Right Card: Bio Link & Channel Sharing */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Link Bio Box */}
                    <div className="bg-white rounded-3xl border border-border p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-secondary text-base">Tautan Toko (Bio Link)</h3>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                            Salin tautan ini dan pasang di bio Instagram, profil TikTok, info WhatsApp, atau Google Bisnis resto Anda. Pelanggan cukup mengklik tautan ini untuk melihat menu dan langsung memesan dari rumah.
                        </p>

                        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                            <span className="text-xs font-mono font-bold text-slate-700 flex-1 truncate px-2 select-all">
                                {storeUrl}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-secondary text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin</span>
                            </button>
                            <button
                                onClick={() => window.open(storeUrl, '_blank')}
                                className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Buka</span>
                            </button>
                        </div>
                    </div>

                    {/* Fitur & Panduan Pakai */}
                    <div className="bg-white rounded-3xl border border-border p-6 shadow-xs space-y-4">
                        <h4 className="font-bold text-secondary text-sm">Bagaimana Pelanggan Memesan lewat Link Ini?</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                                <div className="flex items-center gap-2 text-primary font-bold">
                                    <ShoppingBag className="w-4 h-4" />
                                    <span>Ambil di Toko (Take Away)</span>
                                </div>
                                <p className="text-slate-500 text-[11px] leading-relaxed">
                                    Pelanggan pesan dari rumah, bayar via QRIS, dan datang ke resto tinggal mengambil pesanannya tanpa antre.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                                <div className="flex items-center gap-2 text-primary font-bold">
                                    <Bike className="w-4 h-4" />
                                    <span>Antar ke Rumah (Delivery)</span>
                                </div>
                                <p className="text-slate-500 text-[11px] leading-relaxed">
                                    Pelanggan mengisi alamat lengkap pengiriman. Anda dapat mengirimkan pesanan via kurir internal atau ojek online.
                                </p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border flex items-center gap-2 text-xs text-slate-500">
                            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Semua pesanan online otomatis masuk ke tab <strong>Pesanan</strong> secara real-time.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
