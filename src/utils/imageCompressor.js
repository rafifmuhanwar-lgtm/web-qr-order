/**
 * Utilitas Kompresi Gambar Otomatis di Sisi Klien (Browser Canvas)
 * Mengompres foto menu & logo toko sebelum diunggah ke Supabase Storage.
 * - Memperkecil ukuran file secara drastis (80% - 95% lebih hemat kuota/penyimpanan)
 * - Menjaga gambar tetap jernih dan tajam (resolusi maks 1200px, WebP kualitas tinggi 85%)
 * - Menjaga rasio aspek asli (tidak gepeng/terdistorsi)
 * - Berjalan di latar belakang tanpa mengubah tampilan antarmuka (tanpa popup/notifikasi)
 */

export async function compressImage(file, options = {}) {
    // Jika bukan file gambar atau format vector/animasi (SVG/GIF), lewati tanpa kompresi
    if (!file || !(file instanceof Blob) || !file.type.startsWith('image/')) {
        return file;
    }
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return file;
    }

    const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 0.85,
    } = options;

    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();

            img.onload = () => {
                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;

                // Jika dimensi gambar melebihi batas maks, skala secara proporsional
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file); // Fallback ke file asli jika context canvas tidak tersedia
                    return;
                }

                // Pengaturan smoothing tingkat tinggi untuk ketajaman visual
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Gambar ke canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Dapatkan nama dasar file tanpa ekstensi lama
                const originalName = file.name || 'image';
                const lastDotIndex = originalName.lastIndexOf('.');
                const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;

                // Coba kompresi ke format WebP (modern, super hemat & jernih)
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], `${baseName}.webp`, {
                                type: 'image/webp',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            // Fallback jika browser tidak mendukung toBlob WebP, gunakan JPEG
                            canvas.toBlob(
                                (jpegBlob) => {
                                    if (jpegBlob) {
                                        const jpegFile = new File([jpegBlob], `${baseName}.jpg`, {
                                            type: 'image/jpeg',
                                            lastModified: Date.now(),
                                        });
                                        resolve(jpegFile);
                                    } else {
                                        resolve(file); // Fallback ke file asli
                                    }
                                },
                                'image/jpeg',
                                quality
                            );
                        }
                    },
                    'image/webp',
                    quality
                );
            };

            img.onerror = () => {
                resolve(file); // Fallback jika gagal memuat gambar
            };

            img.src = event.target.result;
        };

        reader.onerror = () => {
            resolve(file); // Fallback jika gagal membaca file
        };

        reader.readAsDataURL(file);
    });
}
