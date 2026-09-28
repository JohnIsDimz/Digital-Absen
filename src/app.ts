import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { errorHandler, notFound } from './middlewares/errorHandler';
import { env } from './config/env';

// Routes v0.5
import authRoutes from './routes/auth.routes';
import qrRoutes from './routes/qr.routes';
import absensiRoutes from './routes/absensi.routes';
import izinRoutes from './routes/izin.routes';
import dashboardRoutes from './routes/dashboard.routes';
import rekapRoutes from './routes/rekap.routes';
import kelasRoutes from './routes/kelas.routes';
import siswaRoutes from './routes/siswa.routes';
import guruRoutes from './routes/guru.routes';
import settingsRoutes from './routes/settings.routes';
import profileRoutes from './routes/profile.routes';
import nikRoutes from './routes/nik.routes';

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health v0.5 - Fix semua fungsi
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AbsenSiswa Neo-Brutalist API v0.5 - Fix Semua Fungsi: Profil Murid Real, Rekap Real, Semua Data Nyata',
    timestamp: new Date().toISOString(),
    tahunSekarang: env.CURRENT_YEAR,
    tahunAjaran: env.TAHUN_AJARAN,
    version: '0.5.0',
    dataStatus: 'REAL DATA - No Dummy - Semua Fungsi Real',
    htmlFiles: {
      useful: true,
      original: 'Desain 100% original neo-brutalist dari kamu - tetap dipakai',
      shortNames: 'Sudah diganti nama pendek v0.5',
      list: {
        'index.html': 'Welcome_pemilihan_pesan_guru_vs_siswa.html → index.html',
        'login-guru.html': 'login_guru_wali_kelas_akun_kedinasan.html → login-guru.html',
        'dashboard-siswa.html': 'dashboard_beranda_siswa.html → dashboard-siswa.html',
        'dashboard-guru.html': 'dashboard_guru_wali_kelas.html → dashboard-guru.html',
        'scan.html': 'pemindai_qr_lokasi.html → scan.html',
        'izin.html': 'Pengajuan_izin_sakit.html → izin.html',
        'rekap.html': 'Rekap_Laporan_kehadiran.html → rekap.html',
        'siswa.html': 'daftar_siswa_rekap_siswa.html → siswa.html',
        'export.html': 'export_laporan_nilai_sikap_format_rapor_semester.html → export.html',
        'settings.html': 'NEW v0.5 - Settings Lokasi Dinamis & Tahun 2026',
        'profil.html': 'NEW v0.5 - Profil Real Fix Data Lama',
        'kelas.html': 'NEW v0.5 - Kelas Bisa Diganti',
        'setup.html': 'NEW v0.5 - Setup Tahun 2026'
      }
    },
    nativeTS: {
      backend: '100% native TypeScript & Express.js - bukan NestJS',
      frontend: 'HTML kamu berguna sebagai View layer - desain original',
      api: 'TS Express supply data real via /api/* - HTML fetch via app.js',
      realtime: 'Socket.IO + app.js v0.5 bridge HTML statis jadi dinamis real-time'
    },
    fix: [
      'Profil murid data lama → Real via GET /api/profile/me & /api/profile/siswa/:id',
      'Tahun 2024 → 2026',
      'Lokasi Jakarta hardcode → Dinamis semua kota',
      'Kelas bisa diganti',
      'HTML nama panjang → nama pendek + settings.html baru'
    ],
    features: {
      profilReal: true,
      rekapReal: true,
      kelasBisaDiganti: true,
      lokasiDinamis: true,
      tahun2026: true,
      realtime: true,
      noDummy: true,
      noOldData: true,
      htmlShortNames: true,
      settingsHtml: true
    }
  });
});

// Setup
app.post('/api/setup/init', async (req, res) => {
  try {
    const { db } = await import('./config/db');
    const bcrypt = await import('bcryptjs');
    const { v4: uuidv4 } = await import('uuid');
    const data = db.get();
    if (data.kelas.length > 0) return res.status(400).json({ success: false, message: 'Sudah ada data. Reset via POST /api/setup/reset' });
    const { kelasNama, tahunAjaran, semester, guruNama, guruNip, guruPassword, sekolahNama, sekolahAlamat, lat, lng, radius } = req.body;
    if (!kelasNama || !guruNama || !guruNip || !guruPassword) {
      return res.status(400).json({ success: false, message: 'Wajib: kelasNama, guruNama, guruNip, guruPassword', tahunSekarang: env.CURRENT_YEAR });
    }
    const kelasId = uuidv4(); const guruId = uuidv4();
    const passwordHash = await bcrypt.hash(guruPassword, 10);
    const kodeUndangan = `RPL-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
    const kelas = { id: kelasId, nama: kelasNama, tahunAjaran: tahunAjaran || env.TAHUN_AJARAN, semester: (semester || env.SEMESTER) as any, kodeUndangan, waliKelasId: guruId, totalSiswa: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const guru = { id: guruId, nip: guruNip, nama: guruNama, email: '', passwordHash, role: 'WALI_KELAS' as const, kelasDiampu: [kelasId], createdAt: new Date().toISOString() };
    const settings = {
      id: uuidv4(),
      sekolahNama: sekolahNama || env.SCHOOL_NAME,
      sekolahAlamat: sekolahAlamat || env.SCHOOL_ADDRESS,
      lat: lat || env.SCHOOL_LAT,
      lng: lng || env.SCHOOL_LNG,
      radiusMeter: radius || env.GEOFENCE_RADIUS,
      tahunAjaran: tahunAjaran || env.TAHUN_AJARAN,
      semester: (semester || env.SEMESTER) as any,
      jamMasuk: env.JAM_MASUK,
      batasToleransi: env.BATAS_TOLERANSI,
      updatedAt: new Date().toISOString(),
      updatedBy: guruId
    };
    db.set({ settings, kelas: [kelas], guru: [guru], siswa: [], sesiAbsen: [], absensi: [], izin: [], rekapSikap: [] });
    res.json({ success: true, message: 'Setup v0.5 berhasil - Profil Real, Tahun 2026, Lokasi Dinamis', data: { kelas, guru: { id: guru.id, nip: guru.nip, nama: guru.nama, password: guruPassword }, settings } });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Gagal setup' }); }
});

app.post('/api/setup/reset', (req, res) => {
  try {
    const { db } = require('./config/db');
    db.set({ settings: null, kelas: [], guru: [], siswa: [], sesiAbsen: [], absensi: [], izin: [], rekapSikap: [] });
    res.json({ success: true, message: 'Database reset NOL TOTAL v0.5 - Fix semua fungsi - No Dummy - No Old Data' });
  } catch (e) { res.status(500).json({ success: false, message: 'Gagal reset' }); }
});

// API Routes v0.5 + v0.5.5 NIK KTP
app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/absensi', absensiRoutes);
app.use('/api/izin', izinRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/rekap', rekapRoutes);
app.use('/api/kelas', kelasRoutes);
app.use('/api/siswa', siswaRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/nik', nikRoutes); // NEW v0.5.5 - Verifikasi NIK KTP

// Frontend v0.5 - Nama pendek + file baru settings.html sesuai request native
// File lama panjang tetap ada di public untuk referensi, tapi route pakai nama pendek baru v0.5
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/welcome', (req, res) => res.sendFile(path.join(__dirname, '../public/welcome.html')));
app.get('/login/guru', (req, res) => res.sendFile(path.join(__dirname, '../public/login-guru.html')));
app.get('/dashboard/siswa', (req, res) => res.sendFile(path.join(__dirname, '../public/dashboard-siswa.html')));
app.get('/dashboard/guru', (req, res) => res.sendFile(path.join(__dirname, '../public/dashboard-guru.html')));
app.get('/scan', (req, res) => res.sendFile(path.join(__dirname, '../public/scan.html')));
app.get('/izin', (req, res) => res.sendFile(path.join(__dirname, '../public/izin.html')));
app.get('/rekap', (req, res) => res.sendFile(path.join(__dirname, '../public/rekap.html')));
app.get('/rekap/sikap', (req, res) => res.sendFile(path.join(__dirname, '../public/siswa.html')));
app.get('/siswa', (req, res) => res.sendFile(path.join(__dirname, '../public/siswa.html')));
app.get('/export', (req, res) => res.sendFile(path.join(__dirname, '../public/export.html')));

// NEW v0.5 - File pendek baru sesuai request user: settings.html wajib ada untuk aplikasi native
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, '../public/settings.html')));
app.get('/profil', (req, res) => res.sendFile(path.join(__dirname, '../public/profil.html')));
app.get('/kelas', (req, res) => res.sendFile(path.join(__dirname, '../public/kelas.html')));
app.get('/setup', (req, res) => res.sendFile(path.join(__dirname, '../public/setup.html')));
app.get('/verifikasi-nik', (req, res) => res.sendFile(path.join(__dirname, '../public/verifikasi-nik.html')));
app.get('/nik', (req, res) => res.sendFile(path.join(__dirname, '../public/verifikasi-nik.html')));

app.use(notFound);
app.use(errorHandler);

export default app;
