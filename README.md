# Web QR Order (Sistem Kasir & Pemesanan Mandiri)

Sebuah aplikasi web berbasis Point of Sales (POS) modern yang dilengkapi dengan fitur pemesanan mandiri melalui QR Code untuk pelanggan. Sistem ini didesain dengan alur kerja yang mirip dengan restoran cepat saji masa kini (seperti Mie Gacoan dsb), di mana pelanggan bisa memesan langsung dari meja via QR Code, sementara kasir/admin mengelola pesanan dari dashboard secara real-time.

## 🚀 Fitur Utama

- **Pemesanan via QR Code (Customer)**: Pelanggan memindai QR code meja untuk melihat katalog menu, custom catatan pesanan, memasukkan ke keranjang, dan memantau status pesanan.
- **Pembayaran QRIS & Tunai**: Mendukung integrasi QRIS dinamis dan pembayaran langsung di kasir.
- **Dashboard Admin (Kasir Real-time)**: Antarmuka real-time dengan Supabase Channels untuk mengelola pesanan masuk, status dapur, dan status pembayaran.
- **Manajemen Menu & Kategori**: Admin dapat menambah, mengubah, atau menghapus menu, upload foto ke storage, dan mengelompokkan kategori.
- **Manajemen Meja (QR Generator)**: Admin dapat membuat nomor meja dan secara otomatis men-generate QR Code siap cetak untuk masing-masing meja.
- **Cetak Struk (Receipt Canvas)**: Generator struk pembayaran otomatis ke format gambar PNG siap cetak / unduh.
- **Laporan Penjualan & Kalender**: Rekapitulasi penjualan harian, omzet, dan rincian transaksi per bulan.
- **Kustomisasi Tema Toko**: Admin dapat mengatur identitas resto, logo, warna tema, pesan selamat datang, dan footer struk.

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React 19, Vite, React Router v7
- **Styling**: Tailwind CSS v4
- **Ikon**: Lucide React
- **Backend & Database**: Supabase (PostgreSQL Database, Authentication, Realtime Channels & Storage)
- **Edge Functions**: Supabase Edge Functions (Deno) untuk integrasi payment gateway QRIS
- **Fitur Spesifik**: `qrcode.react` untuk pembuatan QR Code meja, Canvas API untuk generator struk

## 📦 Cara Menjalankan Proyek secara Lokal

1. **Clone repositori ini**:
   ```bash
   git clone https://github.com/rafifmuhanwar-lgtm/web-qr-order.git
   cd web-qr-order/src
   ```

2. **Instal dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables**:
   Buat file `.env` di dalam folder `src` (bisa meng-copy dari `.env.example`) dan isi dengan kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:5173` di browser Anda.

## 🔒 Keamanan
Kredensial API tidak boleh dipublikasikan. Pastikan file `.env` sudah masuk ke dalam `.gitignore` sehingga tidak ikut ter-push ke repository ini.
