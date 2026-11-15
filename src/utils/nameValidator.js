/**
 * Validasi dan sanitasi nama pelanggan (POV Chat & Checkout)
 * Batasan: Minimal 2 karakter, Maksimal 15 karakter
 * Proteksi: Anti-XSS/Simbol, Anti-Impersonasi (Admin/Kasir), Anti-Kata Kasar/Jorok
 */

// Sebutan peran toko / sistem yang tidak boleh dipakai pelanggan iseng
const BLOCKED_ROLES = [
    'admin',
    'administrator',
    'kasir',
    'cashier',
    'owner',
    'dapur',
    'kitchen',
    'pelayan',
    'waiter',
    'resto',
    'restoran',
    'emakan',
    'system',
    'sistem',
    'official',
    'support',
    'bot',
    'server',
];

// Daftar kata kasar / jorok umum (Indonesia & Inggris)
const BAD_WORDS = [
    'anjing',
    'babi',
    'bangsat',
    'kontol',
    'memek',
    'jembut',
    'pepek',
    'pantek',
    'peler',
    'itil',
    'lonte',
    'perek',
    'ngentot',
    'ngewe',
    'tolol',
    'bego',
    'goblok',
    'idiot',
    'bajingan',
    'kampret',
    'tai',
    'fuck',
    'shit',
    'bitch',
    'asshole',
    'cunt',
    'dick',
    'pussy',
    'whore',
    'bastard',
];

/**
 * Validasi nama pelanggan secara menyeluruh
 * @param {string} rawName 
 * @returns {{ valid: boolean, message?: string, sanitizedName?: string }}
 */
export function validateCustomerName(rawName) {
    if (!rawName || typeof rawName !== 'string') {
        return { valid: false, message: 'Mohon masukkan nama Anda' };
    }

    // Normalisasi spasi berlebih
    const trimmed = rawName.trim().replace(/\s+/g, ' ');

    // 1. Batas Panjang: Minimal 2, Maksimal 15 Karakter
    if (trimmed.length < 2) {
        return { valid: false, message: 'Nama minimal 2 karakter' };
    }
    if (trimmed.length > 15) {
        return { valid: false, message: 'Nama maksimal 15 karakter' };
    }

    // 2. Wajib Mengandung Huruf (Tidak boleh hanya angka / simbol)
    if (!/[a-zA-Z]/.test(trimmed)) {
        return { valid: false, message: 'Nama harus mengandung huruf alfabet' };
    }

    // 3. Karakter yang Diizinkan: Huruf, spasi, angka, tanda petik satu ('), dan titik (.)
    const allowedRegex = /^[a-zA-Z0-9\s'.]+$/;
    if (!allowedRegex.test(trimmed)) {
        return { valid: false, message: 'Nama hanya boleh huruf, angka, spasi, tanda petik (\') atau titik (.)' };
    }

    // 4. Mencegah nama angka murni
    if (/^\d+$/.test(trimmed)) {
        return { valid: false, message: 'Nama tidak boleh hanya angka' };
    }

    const lower = trimmed.toLowerCase();

    // 5. Anti-Impersonasi (Menyamar sebagai staf / admin / sistem)
    const isImpersonating = BLOCKED_ROLES.some((role) => {
        // Cek jika persis sama, atau diawali/diakhiri kata tersebut
        return (
            lower === role ||
            lower.startsWith(role + ' ') ||
            lower.endsWith(' ' + role) ||
            lower.includes(' ' + role + ' ')
        );
    });

    if (isImpersonating) {
        return { valid: false, message: 'Nama tidak boleh memakai sebutan staf/admin/resto' };
    }

    // 6. Filter Kata Kasar / Jorok (Profanity Filter)
    const hasBadWord = BAD_WORDS.some((bad) => {
        // Cek apakah mengandung kata terlarang (dengan normalisasi sederhana)
        return lower.includes(bad);
    });

    if (hasBadWord) {
        return { valid: false, message: 'Mohon gunakan nama yang sopan dan pantas' };
    }

    return {
        valid: true,
        sanitizedName: trimmed,
    };
}
