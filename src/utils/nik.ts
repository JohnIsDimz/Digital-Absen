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
  tanggalLahir?: string; // YYYY-MM-DD
  jenisKelamin?: 'L' | 'P';
  umur?: number;
  error?: string;
}

// Daftar provinsi (singkat, bisa dilengkapi)
const PROVINSI_MAP: Record<string, string> = {
  '11': 'Aceh',
  '12': 'Sumatera Utara',
  '13': 'Sumatera Barat',
  '14': 'Riau',
  '15': 'Jambi',
  '16': 'Sumatera Selatan',
  '17': 'Bengkulu',
  '18': 'Lampung',
  '19': 'Bangka Belitung',
  '21': 'Kepulauan Riau',
  '31': 'DKI Jakarta',
  '32': 'Jawa Barat',
  '33': 'Jawa Tengah',
  '34': 'DI Yogyakarta',
  '35': 'Jawa Timur',
  '36': 'Banten',
  '51': 'Bali',
  '52': 'Nusa Tenggara Barat',
  '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat',
  '62': 'Kalimantan Tengah',
  '63': 'Kalimantan Selatan',
  '64': 'Kalimantan Timur',
  '65': 'Kalimantan Utara',
  '71': 'Sulawesi Utara',
  '72': 'Sulawesi Tengah',
  '73': 'Sulawesi Selatan',
  '74': 'Sulawesi Tenggara',
  '75': 'Gorontalo',
  '76': 'Sulawesi Barat',
  '81': 'Maluku',
  '82': 'Maluku Utara',
  '91': 'Papua Barat',
  '94': 'Papua',
};

/**
 * Validasi NIK KTP Indonesia
 * @param nik - 16 digit NIK
 * @returns NIKInfo dengan detail validasi
 */
export function validateNIK(nik: string): NIKInfo {
  // Bersihkan NIK dari spasi dan karakter non-digit
  const cleanNIK = nik.replace(/\D/g, '');

  // Cek panjang
  if (cleanNIK.length !== 16) {
    return {
      valid: false,
      nik: cleanNIK,
      error: `NIK harus 16 digit, saat ini ${cleanNIK.length} digit`,
    };
  }

  // Cek semua digit angka
  if (!/^\d{16}$/.test(cleanNIK)) {
    return {
      valid: false,
      nik: cleanNIK,
      error: 'NIK harus berupa angka',
    };
  }

  // Cek tidak semua 0
  if (cleanNIK === '0000000000000000') {
    return {
      valid: false,
      nik: cleanNIK,
      error: 'NIK tidak valid (semua 0)',
    };
  }

  // Parsing komponen NIK
  const prov = cleanNIK.substring(0, 2);
  const kab = cleanNIK.substring(2, 4);
  const kec = cleanNIK.substring(4, 6);
  const tgl = parseInt(cleanNIK.substring(6, 8), 10);
  const bln = parseInt(cleanNIK.substring(8, 10), 10);
  const thn = parseInt(cleanNIK.substring(10, 12), 10);
  const urut = cleanNIK.substring(12, 16);

  // Validasi provinsi
  if (!PROVINSI_MAP[prov]) {
    // Tidak strict, karena daftar provinsi bisa bertambah, hanya warning
    // return { valid: false, nik: cleanNIK, error: `Kode provinsi ${prov} tidak dikenal` };
  }

  // Validasi tanggal lahir
  let hari = tgl;
  let jenisKelamin: 'L' | 'P' = 'L';

  if (tgl > 40) {
    hari = tgl - 40;
    jenisKelamin = 'P';
  }

  if (hari < 1 || hari > 31) {
    return {
      valid: false,
      nik: cleanNIK,
      error: `Tanggal lahir tidak valid: hari ${tgl} (setelah dikurangi 40 untuk perempuan: ${hari})`,
    };
  }

  if (bln < 1 || bln > 12) {
    return {
      valid: false,
      nik: cleanNIK,
      error: `Bulan lahir tidak valid: ${bln}`,
    };
  }

  // Validasi tahun (asumsi 1900-2026)
  let tahunFull = 1900 + thn;
  if (thn <= 26) {
    // Jika tahun <= 26 (2026), anggap 2000-an
    tahunFull = 2000 + thn;
  }

  // Cek tanggal valid dengan Date
  const dateObj = new Date(tahunFull, bln - 1, hari);
  if (dateObj.getDate() !== hari || dateObj.getMonth() !== bln - 1 || dateObj.getFullYear() !== tahunFull) {
    return {
      valid: false,
      nik: cleanNIK,
      error: `Tanggal lahir tidak valid: ${hari}-${bln}-${tahunFull}`,
    };
  }

  // Cek umur tidak negatif dan tidak terlalu tua (>100 tahun)
  const today = new Date();
  let umur = today.getFullYear() - tahunFull;
  if (today.getMonth() < bln - 1 || (today.getMonth() === bln - 1 && today.getDate() < hari)) {
    umur--;
  }

  if (umur < 0 || umur > 100) {
    return {
      valid: false,
      nik: cleanNIK,
      error: `Umur tidak valid: ${umur} tahun (lahir ${tahunFull})`,
    };
  }

  // Validasi nomor urut tidak 0000
  if (urut === '0000') {
    return {
      valid: false,
      nik: cleanNIK,
      error: 'Nomor urut NIK tidak boleh 0000',
    };
  }

  // Jika semua validasi lolos
  const tanggalLahir = `${tahunFull}-${String(bln).padStart(2, '0')}-${String(hari).padStart(2, '0')}`;

  return {
    valid: true,
    nik: cleanNIK,
    provinsi: PROVINSI_MAP[prov] || `Provinsi ${prov}`,
    kabupaten: `Kab/Kota ${kab}`,
    kecamatan: `Kec ${kec}`,
    tanggalLahir,
    jenisKelamin,
    umur,
  };
}

/**
 * Format NIK dengan spasi untuk readability
 * Contoh: 3273012309970001 → 3273 0123 0997 0001
 */
export function formatNIK(nik: string): string {
  const clean = nik.replace(/\D/g, '');
  return clean.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
}

/**
 * Masking NIK untuk privacy (tampilkan 4 digit terakhir saja)
 * Contoh: 3273012309970001 → **** **** **** 0001
 */
export function maskNIK(nik: string): string {
  const clean = nik.replace(/\D/g, '');
  if (clean.length !== 16) return clean;
  return `**** **** **** ${clean.substring(12, 16)}`;
}

/**
 * Cek NIK sudah terdaftar di database (anti duplikat)
 */
export function isNIKDuplicate(nik: string, existingNIKs: string[]): boolean {
  const clean = nik.replace(/\D/g, '');
  return existingNIKs.includes(clean);
}
