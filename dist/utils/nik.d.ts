/**
 * NIK KTP Verifikasi - 16 Digit NIK Indonesia
 * Format NIK: PP.DD.CC.DDMMYY.XXXX (16 digit)
 * PP = Provinsi (2 digit)
 * DD = Kabupaten/Kota (2 digit)
 * CC = Kecamatan (2 digit)
 * DDMMYY = Tanggal Lahir + Jenis Kelamin (6 digit, hari +40 untuk perempuan)
 * XXXX = Nomor urut (4 digit)
 *
 * Contoh: 3273012309970001
 * 32 = Jawa Barat
 * 73 = Kota Bandung
 * 01 = Kecamatan
 * 23-09-97 = 23 Sep 1997 (Laki-laki)
 * 0001 = Nomor urut
 */
export interface NIKInfo {
    valid: boolean;
    nik: string;
    provinsi?: string;
    kabupaten?: string;
    kecamatan?: string;
    tanggalLahir?: string;
    jenisKelamin?: 'L' | 'P';
    umur?: number;
    error?: string;
}
/**
 * Validasi NIK KTP Indonesia
 * @param nik - 16 digit NIK
 * @returns NIKInfo dengan detail validasi
 */
export declare function validateNIK(nik: string): NIKInfo;
/**
 * Format NIK dengan spasi untuk readability
 * Contoh: 3273012309970001 → 3273 0123 0997 0001
 */
export declare function formatNIK(nik: string): string;
/**
 * Masking NIK untuk privacy (tampilkan 4 digit terakhir saja)
 * Contoh: 3273012309970001 → **** **** **** 0001
 */
export declare function maskNIK(nik: string): string;
/**
 * Cek NIK sudah terdaftar di database (anti duplikat)
 */
export declare function isNIKDuplicate(nik: string, existingNIKs: string[]): boolean;
//# sourceMappingURL=nik.d.ts.map