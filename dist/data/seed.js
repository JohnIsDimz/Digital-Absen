"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
/**
 * SEED v0.2 - REAL-TIME 100% DATA NYATA - NO DUMMY
 * Sesuai permintaan: siswa/guru ga dibuat, data real-time, data nyata 100%
 *
 * v0.2: Database benar-benar NOL total.
 * Tidak ada kelas, tidak ada guru, tidak ada siswa dummy.
 * Semua harus dibuat manual via API /setup dengan data nyata.
 */
const seedV02Real = async () => {
    console.log('🌱 Seeding AbsenSiswa v0.2 - REAL-TIME - DATA NYATA 100% - NO DUMMY...');
    console.log('📐 Desain 100% original, semua data NOL, tidak ada dummy');
    // TRUE ZERO - no data at all
    const emptyDB = {
        settings: null,
        kelas: [],
        guru: [],
        siswa: [],
        sesiAbsen: [],
        absensi: [],
        izin: [],
        rekapSikap: []
    };
    db_1.db.set(emptyDB);
    console.log('✅ Database v0.2 - TRUE ZERO - NOL TOTAL!');
    console.log('   Kelas: 0');
    console.log('   Guru: 0');
    console.log('   Siswa: 0');
    console.log('   Absensi: 0');
    console.log('   Izin: 0');
    console.log('   Rekap: 0%');
    console.log('');
    console.log('📐 Desain: 100% sama seperti HTML asli kamu');
    console.log('🔢 Semua dashboard = 0 (data NOL)');
    console.log('🏷️ Versi: 0.2.0 - Real-Time + Real Data');
    console.log('🚫 Tidak ada dummy siswa/guru - semua harus data nyata');
    console.log('');
    console.log('🔧 Cara buat data nyata pertama:');
    console.log('   1. Buka http://localhost:3000/setup');
    console.log('   2. Isi form kelas + guru real (nama, NIP, password real)');
    console.log('   3. Atau POST /api/setup/init dengan JSON real');
    console.log('   4. Lalu tambah siswa real via POST /api/siswa');
    console.log('   5. Semua akan real-time via Socket.IO');
};
seedV02Real().catch(console.error);
//# sourceMappingURL=seed.js.map