/**
 * Validasi dan sanitasi nama pelanggan (POV Chat & Checkout)
 * Batasan: Minimal 2 karakter, Maksimal 15 karakter
 * Proteksi:
 * 1. Anti-XSS & Simbol Aneh
 * 2. Anti-Impersonasi (Menyamar sebagai Admin, Kasir, Dapur, Owner, Ojol, Sistem)
 * 3. Anti-Kata Kasar / Jorok / Vulgar / SARA (Bahasa Indonesia, Daerah, dan Inggris)
 * 4. Anti-Bypass Leetspeak (contoh: 4nj1ng, k0nt0l, b4ngs4t)
 */

// Sebutan peran toko, sistem, dan kurir yang tidak boleh dipakai pelanggan
const BLOCKED_ROLES = [
    // Staf Resto & Manajemen
    'admin',
    'administrator',
    'adm',
    'adminresto',
    'kasir',
    'cashier',
    'owner',
    'bos',
    'boss',
    'founder',
    'manager',
    'supervisor',
    'spv',
    'dapur',
    'kitchen',
    'chef',
    'koki',
    'barista',
    'pelayan',
    'waiter',
    'waitress',
    'pramusaji',
    'runner',
    'resto',
    'restoran',
    'outlet',
    'cafe',
    'kafe',
    'warung',
    'kedai',
    // Sistem & Brand
    'emakan',
    'emakanpos',
    'pos',
    'system',
    'sistem',
    'server',
    'bot',
    'robot',
    'developer',
    'dev',
    'programmer',
    'official',
    'validasi',
    'cs',
    'customerservice',
    'support',
    'helpdesk',
    'pusat',
    // Kurir / Ojek Online
    'driver',
    'kurir',
    'courier',
    'ojol',
    'gojek',
    'grab',
    'shopee',
    'maxim',
    'indriver',
];

// Kata kasar pendek yang wajib dicek secara kata utuh (standalone tokens)
// agar tidak salah memblokir nama asli yang sah (contoh: Bagus, Basuki, Siti, Titik, Pantai)
const STANDALONE_BAD_WORDS = new Set([
    'asu',
    'cuk',
    'cok',
    'tai',
    'taek',
    'itil',
    'bo',
    'hoe',
    'ass',
    'fag',
    'titit',
    'tetek',
    'toket',
    'sange',
    'coli',
    'pepek',
    'puki',
    'perek',
]);

// Daftar kata kasar, makian, pornografi, dan cercaan daerah yang tidak boleh muncul sama sekali
const GENERAL_BAD_WORDS = [
    // Hewan & Makian Umum Indonesia
    'anjing',
    'anying',
    'anjir',
    'anjay',
    'babi',
    'bangsat',
    'bajingan',
    'kampret',
    'keparat',
    'jahanam',
    'brengsek',
    'bedebah',
    'sialan',
    'setan',
    'iblis',
    'dajjal',
    'laknat',
    'celeng',
    'monyet',
    'kunyuk',
    'biadab',
    // Organ Tubuh & Seksualitas
    'kontol',
    'koncol',
    'memek',
    'jembut',
    'peler',
    'pelir',
    'ngentot',
    'ngentod',
    'ngewe',
    'colmek',
    'masturbasi',
    'bokep',
    'porno',
    'bugil',
    'telanjang',
    'vagina',
    'penis',
    'tempik',
    'pukimak',
    'pukimai',
    'pantek',
    'panteq',
    // Prostitusi & Pekerja Seks
    'lonte',
    'lonthe',
    'jablay',
    'bispak',
    'openbo',
    'pelacur',
    'sundel',
    'sundal',
    'mucikari',
    'germo',
    // Bahasa Daerah (Jawa, Sunda, Batak, Minang, dll.)
    'jancok',
    'dancok',
    'jancuk',
    'dancuk',
    'matamu',
    'raimu',
    'ndasmu',
    'bajindul',
    'kirik',
    'kehed',
    'bagong',
    'modar',
    'bodat',
    // Hinaan Mental & Fisik
    'goblok',
    'goblog',
    'tolol',
    'bego',
    'idiot',
    'dungu',
    'bebal',
    'sinting',
    'sarap',
    // Bahasa Inggris & Slurs
    'fuck',
    'fucker',
    'fucking',
    'shit',
    'bullshit',
    'bitch',
    'asshole',
    'cunt',
    'dick',
    'pussy',
    'whore',
    'slut',
    'bastard',
    'motherfucker',
    'retard',
    'nigger',
    'nigga',
    'faggot',
];

/**
 * Normalisasi leetspeak / teks samaran (misal 4nj1ng -> anjing, k0nt0l -> kontol)
 */
function normalizeLeetspeak(str) {
    return str
        .toLowerCase()
        .replace(/4|@/g, 'a')
        .replace(/0/g, 'o')
        .replace(/1|!|\|/g, 'i')
        .replace(/3/g, 'e')
        .replace(/5|\$/g, 's')
        .replace(/7/g, 't')
        .replace(/8/g, 'b');
}

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
    const normalized = normalizeLeetspeak(trimmed);
    const compactNormalized = normalized.replace(/[^a-z]/g, '');

    // 5. Anti-Impersonasi (Menyamar sebagai staf / admin / sistem)
    const isImpersonating = BLOCKED_ROLES.some((role) => {
        return (
            lower === role ||
            lower.startsWith(role + ' ') ||
            lower.endsWith(' ' + role) ||
            lower.includes(' ' + role + ' ') ||
            normalized === role ||
            normalized.startsWith(role + ' ') ||
            normalized.endsWith(' ' + role)
        );
    });

    if (isImpersonating) {
        return { valid: false, message: 'Nama tidak boleh memakai sebutan staf/admin/resto' };
    }

    // 6. Cek kata kasar pendek khusus (Standalone tokens)
    const tokens = normalized.split(/[\s'._-]+/).filter(Boolean);
    for (const token of tokens) {
        if (STANDALONE_BAD_WORDS.has(token)) {
            return { valid: false, message: 'Mohon gunakan nama yang sopan dan pantas' };
        }
    }

    // 7. Cek kata kasar umum & daerah (termasuk deteksi leetspeak 4nj1ng, k0nt0l)
    const hasBadWord = GENERAL_BAD_WORDS.some((bad) => {
        return (
            lower.includes(bad) ||
            normalized.includes(bad) ||
            compactNormalized.includes(bad)
        );
    });

    if (hasBadWord) {
        return { valid: false, message: 'Mohon gunakan nama yang sopan dan pantas' };
    }

    return {
        valid: true,
        sanitizedName: trimmed,
    };
}
