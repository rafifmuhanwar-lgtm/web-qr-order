# Web QR Order (Sistem Kasir & Pemesanan Mandiri)

Sebuah aplikasi web berbasis Point of Sales (POS) modern yang dilengkapi dengan fitur pemesanan mandiri melalui QR Code untuk pelanggan. Sistem ini didesain dengan alur kerja yang mirip dengan restoran cepat saji masa kini (seperti Gacoan dsb), di mana pelanggan bisa memesan dari meja, sementara kasir/admin mengelola pesanan dari dashboard.

## 🚀 Fitur Utama

- **Pemesanan via QR Code (Customer)**: Pelanggan dapat memindai QR code meja untuk melihat menu, memasukkan pesanan ke keranjang, dan memantau status pesanan.
- **Dashboard Admin (Kasir)**: Antarmuka untuk mengelola pesanan yang masuk secara real-time.
- **Manajemen Menu & Kategori**: Admin dapat menambah, mengubah, atau menghapus menu beserta kategorinya.
- **Manajemen Meja (QR Generator)**: Admin dapat membuat data meja dan secara otomatis men-generate QR Code untuk masing-masing meja.
- **Cetak Struk (Receipt)**: Mendukung fitur pembuatan dan pencetakan struk pembayaran.
- **Laporan Penjualan**: Halaman laporan untuk melihat rekapitulasi penjualan.

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React (v19), Vite, React Router
- **Styling**: Tailwind CSS
- **Ikon**: Lucide React
- **Backend & Database**: Firebase (Authentication & Cloud Firestore)
- **Fitur Spesifik**: `qrcode.react` untuk pembuatan QR Code

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
   Buat file `.env` di dalam folder `src` (bisa meng-copy dari `.env.example`) dan isi dengan konfigurasi Firebase Anda:
   ```env
   VITE_FIREBASE_API_KEY="api-key-anda"
   VITE_FIREBASE_AUTH_DOMAIN="domain-auth-anda"
   VITE_FIREBASE_PROJECT_ID="project-id-anda"
   VITE_FIREBASE_STORAGE_BUCKET="storage-bucket-anda"
   VITE_FIREBASE_MESSAGING_SENDER_ID="sender-id-anda"
   VITE_FIREBASE_APP_ID="app-id-anda"
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:5173` di browser Anda.

## 🔒 Keamanan
Data kredensial Firebase tidak boleh dipublikasikan. Pastikan file `.env` sudah masuk ke dalam `.gitignore` sehingga tidak ikut ter-push ke repository ini.
