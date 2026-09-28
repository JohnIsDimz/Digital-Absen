export type Role = 'SISWA' | 'WALI_KELAS' | 'GURU' | 'ADMIN';
export type StatusAbsen = 'HADIR' | 'TERLAMBAT' | 'SAKIT' | 'IZIN' | 'DISPENSASI' | 'ALPHA' | 'BELUM_CHECKIN';
export type KategoriIzin = 'SAKIT' | 'IZIN_PRIBADI' | 'DISPENSASI';
export type StatusIzin = 'PENDING' | 'DISETUJUI' | 'DITOLAK';
export type PredikatSikap = 'A' | 'B' | 'C' | 'D';
export interface Kelas {
    id: string;
    nama: string;
    tahunAjaran: string;
    semester: 'GANJIL' | 'GENAP';
    kodeUndangan: string;
    waliKelasId?: string;
    totalSiswa: number;
    createdAt: string;
}
export interface Guru {
    id: string;
    nip: string;
    nama: string;
    email?: string;
    passwordHash: string;
    role: Role;
    kelasDiampu?: string[];
    avatarUrl?: string;
    createdAt: string;
    nik?: string;
    nikVerified?: boolean;
    nikVerifiedAt?: string;
}
export interface Siswa {
    id: string;
    nisn: string;
    noAbsen: number;
    nama: string;
    kelasId: string;
    pin?: string;
    passwordHash?: string;
    deviceId?: string;
    avatarInitial: string;
    ortuWhatsapp?: string;
    poinSikap: number;
    predikat: PredikatSikap;
    kodeUndangan?: string;
    createdAt: string;
    nik?: string;
    nikVerified?: boolean;
    nikVerifiedAt?: string;
    nikVerifiedBy?: string;
    ktpFotoPath?: string;
}
export interface SesiAbsen {
    id: string;
    kelasId: string;
    tanggal: string;
    jamMasuk: string;
    batasToleransi: string;
    qrCode: string;
    qrPayload: string;
    qrExpiresAt: string;
    isLocked: boolean;
    createdBy: string;
    createdAt: string;
}
export interface Absensi {
    id: string;
    siswaId: string;
    sesiId: string;
    tanggal: string;
    jamCheckin: string;
    jamCheckinFull: string;
    status: StatusAbsen;
    keterlambatanMenit: number;
    lokasi: {
        lat: number;
        lng: number;
        nama: string;
        jarakMeter: number;
        isWithinGeofence: boolean;
    };
    faceVerified: boolean;
    deviceId?: string;
    createdAt: string;
}
export interface PengajuanIzin {
    id: string;
    siswaId: string;
    kategori: KategoriIzin;
    tglMulai: string;
    tglSelesai: string;
    durasiHari: number;
    alasan: string;
    fileBukti?: {
        originalName: string;
        path: string;
        size: number;
        mimetype: string;
    };
    status: StatusIzin;
    approvedBy?: string;
    approvedAt?: string;
    catatanGuru?: string;
    createdAt: string;
}
export interface RekapSikap {
    id: string;
    siswaId: string;
    semester: string;
    tahunAjaran: string;
    rataRata: number;
    predikatAkhir: PredikatSikap;
    dimensi: {
        beriman: {
            predikat: PredikatSikap;
            catatan: string;
        };
        gotongRoyong: {
            predikat: PredikatSikap;
            catatan: string;
        };
        mandiri: {
            predikat: PredikatSikap;
            catatan: string;
        };
    };
    presensi: {
        totalHari: number;
        hadir: number;
        terlambat: number;
        sakit: number;
        izin: number;
        alpha: number;
        persentase: number;
    };
    poin: {
        pelanggaran: number;
        prestasi: number;
        total: number;
    };
    catatanWali: string;
    layakKelulusan: boolean;
}
export interface JwtPayload {
    id: string;
    role: Role;
    kelasId?: string;
    nisn?: string;
    nip?: string;
}
export interface DashboardSiswa {
    profil: Siswa;
    kelas: Kelas;
    statusHariIni: Absensi | null;
    rekapBulan: {
        hadir: number;
        terlambat: number;
        izin: number;
        sakit: number;
        alpha: number;
        persentase: number;
    };
    riwayat: Absensi[];
    notifikasiOrtu: boolean;
}
export interface DashboardGuru {
    kelas: Kelas;
    sesiAktif: SesiAbsen | null;
    metrik: {
        total: number;
        hadir: number;
        tepatWaktu: number;
        terlambat: number;
        izinSakit: number;
        alpha: number;
        persentase: number;
    };
    pendingIzin: (PengajuanIzin & {
        siswa: Siswa;
    })[];
    pantauanKhusus: (Siswa & {
        absensiHariIni?: Absensi;
    })[];
}
//# sourceMappingURL=index.d.ts.map