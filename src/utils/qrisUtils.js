/**
 * QRIS Dinamis Generator & EMVCo Standard Validator
 * Mendukung Inject Tag 54 (Transaction Amount) + Tag 01 (Dynamic 010212) + CRC16 Checksum
 */

export const MASTER_QRIS_STATIC =
    '00020101021126610014COM.GO-JEK.WWW01189360091433186083620210G3186083620303UMI51440014ID.CO.QRIS.WWW0215ID10264903050790303UMI5204899953033605802ID5925BAYAR VIA QRIS, Digital &6006BEKASI61051732062070703A01630454CF';

export const MASTER_MERCHANT_INFO = {
    name: 'BAYAR VIA QRIS, Digital &',
    address: 'BEKASI 17320',
    nmid: 'ID1026490305079',
    city: 'BEKASI',
    provider: 'GoPay Merchant',
};

/**
 * CRC16-CCITT (Polynomial 0x1021, Initial 0xFFFF)
 * Standar Resmi Bank Indonesia / ASPI untuk QRIS
 */
export function crc16(data) {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xffff;
            } else {
                crc = (crc << 1) & 0xffff;
            }
        }
    }
    const hex = (crc & 0xffff).toString(16).toUpperCase();
    return hex.padStart(4, '0');
}

/**
 * Mengubah QRIS Statis Menjadi QRIS Dinamis dengan Nominal Terkunci Otomatis
 * @param {string} rawStatic - Payload QRIS statis asli
 * @param {number} amount - Nominal pas tagihan (termasuk kode unik)
 * @returns {string} Payload QRIS Dinamis lengkap siap render
 */
export function generateDynamicQris(rawStatic = MASTER_QRIS_STATIC, amount = 0) {
    if (!rawStatic || !amount || amount <= 0) return rawStatic || MASTER_QRIS_STATIC;

    // 1. Buang checksum lama (4 karakter terakhir setelah Tag 6304)
    let base = rawStatic.trim();
    const crcPos = base.lastIndexOf('6304');
    if (crcPos !== -1) {
        base = base.substring(0, crcPos);
    }

    // 2. Ubah Tag 01 (Point of Initiation): '010211' (Statis) -> '010212' (Dinamis)
    base = base.replace('010211', '010212');

    // 3. Format Tag 54 (Transaction Amount): '54' + Length (2 digit) + Amount
    const amtStr = Math.round(Number(amount)).toString();
    const amtLen = amtStr.length.toString().padStart(2, '0');
    const tag54 = `54${amtLen}${amtStr}`;

    // 4. Sisipkan Tag 54 sebelum Tag 58 (5802ID = Country Code)
    let payloadWithAmount = '';
    if (base.includes('5802ID')) {
        const parts = base.split('5802ID');
        payloadWithAmount = parts[0] + tag54 + '5802ID' + parts[1];
    } else {
        payloadWithAmount = base + tag54;
    }

    // 5. Tambahkan identifier checksum '6304' lalu hitung CRC16 baru
    const payloadToHash = payloadWithAmount + '6304';
    const checksum = crc16(payloadToHash);

    return payloadToHash + checksum;
}

/**
 * Generate nominal unik 3 digit (e.g. Rp 35.000 -> Rp 35.123)
 */
export function generateUniqueAmount(baseAmount, seed = '') {
    const base = Number(baseAmount) || 0;
    // Deterministic 3-digit unique code: 101 to 989
    const hash = (seed || Date.now().toString())
        .split('')
        .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const uniqueCode = 100 + (hash % 889); // 100 to 988
    return {
        baseAmount: base,
        uniqueCode,
        totalAmount: base + uniqueCode,
    };
}
