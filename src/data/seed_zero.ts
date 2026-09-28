import { db } from '../config/db';

/**
 * RESET TO ZERO - v0.1
 * Hapus semua data, kembali ke NOL
 */

const resetZero = async () => {
  console.log('🗑️ Reset database ke NOL - v0.1...');
  
  db.set({
    kelas: [],
    guru: [],
    siswa: [],
    sesiAbsen: [],
    absensi: [],
    izin: [],
    rekapSikap: []
  });

  console.log('✅ Database sekarang NOL total - tidak ada data sama sekali');
  console.log('📐 Desain tetap sama, versi 0.1');
};

resetZero().catch(console.error);
