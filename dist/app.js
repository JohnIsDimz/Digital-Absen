"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const errorHandler_1 = require("./middlewares/errorHandler");
const env_1 = require("./config/env");
// Routes v0.5
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const qr_routes_1 = __importDefault(require("./routes/qr.routes"));
const absensi_routes_1 = __importDefault(require("./routes/absensi.routes"));
const izin_routes_1 = __importDefault(require("./routes/izin.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const rekap_routes_1 = __importDefault(require("./routes/rekap.routes"));
const kelas_routes_1 = __importDefault(require("./routes/kelas.routes"));
const siswa_routes_1 = __importDefault(require("./routes/siswa.routes"));
const guru_routes_1 = __importDefault(require("./routes/guru.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const nik_routes_1 = __importDefault(require("./routes/nik.routes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health v0.6 - QR, camera, GPS, and UI reliability
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Digital Apsen API v0.6 - QR, kamera, GPS, profil, dan rekap siap diuji',
        timestamp: new Date().toISOString(),
        tahunSekarang: env_1.env.CURRENT_YEAR,
        tahunAjaran: env_1.env.TAHUN_AJARAN,
        version: '0.6.0',
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
            qrPayloadParsing: true,
            qrAutoRefresh: true,
            cameraLibraryFallback: true,
            gpsRequiredForCheckIn: true,
            iconCacheBusted: true,
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
        const { db } = await Promise.resolve().then(() => __importStar(require('./config/db')));
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
        const { v4: uuidv4 } = await Promise.resolve().then(() => __importStar(require('uuid')));
        const data = db.get();
        if (data.kelas.length > 0)
            return res.status(400).json({ success: false, message: 'Sudah ada data. Reset via POST /api/setup/reset' });
        const { kelasNama, tahunAjaran, semester, guruNama, guruNip, guruPassword, sekolahNama, sekolahAlamat, lat, lng, radius } = req.body;
        if (!kelasNama || !guruNama || !guruNip || !guruPassword) {
            return res.status(400).json({ success: false, message: 'Wajib: kelasNama, guruNama, guruNip, guruPassword', tahunSekarang: env_1.env.CURRENT_YEAR });
        }
        const kelasId = uuidv4();
        const guruId = uuidv4();
        const passwordHash = await bcrypt.hash(guruPassword, 10);
        const kodeUndangan = `RPL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const kelas = { id: kelasId, nama: kelasNama, tahunAjaran: tahunAjaran || env_1.env.TAHUN_AJARAN, semester: (semester || env_1.env.SEMESTER), kodeUndangan, waliKelasId: guruId, totalSiswa: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const guru = { id: guruId, nip: guruNip, nama: guruNama, email: '', passwordHash, role: 'WALI_KELAS', kelasDiampu: [kelasId], createdAt: new Date().toISOString() };
        const settings = {
            id: uuidv4(),
            sekolahNama: sekolahNama || env_1.env.SCHOOL_NAME,
            sekolahAlamat: sekolahAlamat || env_1.env.SCHOOL_ADDRESS,
            lat: lat || env_1.env.SCHOOL_LAT,
            lng: lng || env_1.env.SCHOOL_LNG,
            radiusMeter: radius || env_1.env.GEOFENCE_RADIUS,
            tahunAjaran: tahunAjaran || env_1.env.TAHUN_AJARAN,
            semester: (semester || env_1.env.SEMESTER),
            jamMasuk: env_1.env.JAM_MASUK,
            batasToleransi: env_1.env.BATAS_TOLERANSI,
            updatedAt: new Date().toISOString(),
            updatedBy: guruId
        };
        db.set({ settings, kelas: [kelas], guru: [guru], siswa: [], sesiAbsen: [], absensi: [], izin: [], rekapSikap: [] });
        res.json({ success: true, message: 'Setup v0.5 berhasil - Profil Real, Tahun 2026, Lokasi Dinamis', data: { kelas, guru: { id: guru.id, nip: guru.nip, nama: guru.nama, password: guruPassword }, settings } });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Gagal setup' });
    }
});
app.post('/api/setup/reset', (req, res) => {
    try {
        const { db } = require('./config/db');
        db.set({ settings: null, kelas: [], guru: [], siswa: [], sesiAbsen: [], absensi: [], izin: [], rekapSikap: [] });
        res.json({ success: true, message: 'Database reset NOL TOTAL v0.5 - Fix semua fungsi - No Dummy - No Old Data' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Gagal reset' });
    }
});
// API Routes v0.5 + v0.5.5 NIK KTP
app.use('/api/auth', auth_routes_1.default);
app.use('/api/qr', qr_routes_1.default);
app.use('/api/absensi', absensi_routes_1.default);
app.use('/api/izin', izin_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/rekap', rekap_routes_1.default);
app.use('/api/kelas', kelas_routes_1.default);
app.use('/api/siswa', siswa_routes_1.default);
app.use('/api/guru', guru_routes_1.default);
app.use('/api/settings', settings_routes_1.default);
app.use('/api/profile', profile_routes_1.default);
app.use('/api/nik', nik_routes_1.default); // NEW v0.5.5 - Verifikasi NIK KTP
// Frontend v0.5 - Nama pendek + file baru settings.html sesuai request native
// File lama panjang tetap ada di public untuk referensi, tapi route pakai nama pendek baru v0.5
app.get('/', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/index.html')));
app.get('/welcome', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/welcome.html')));
app.get('/login/guru', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/login-guru.html')));
app.get('/dashboard/siswa', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/dashboard-siswa.html')));
app.get('/dashboard/guru', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/dashboard-guru.html')));
app.get('/scan', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/scan.html')));
app.get('/izin', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/izin.html')));
app.get('/rekap', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/rekap.html')));
app.get('/rekap/sikap', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/siswa.html')));
app.get('/siswa', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/siswa.html')));
app.get('/export', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/export.html')));
// NEW v0.5 - File pendek baru sesuai request user: settings.html wajib ada untuk aplikasi native
app.get('/settings', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/settings.html')));
app.get('/profil', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/profil.html')));
app.get('/kelas', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/kelas.html')));
app.get('/setup', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/setup.html')));
app.get('/verifikasi-nik', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/verifikasi-nik.html')));
app.get('/nik', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/verifikasi-nik.html')));
// NEW v1.0.26 - Fix Bug Guru Daftar & Reset Password
app.get('/daftar-guru', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/daftar-guru.html')));
app.get('/register-guru', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/daftar-guru.html')));
app.get('/lupa-password-guru', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/lupa-password-guru.html')));
app.get('/reset-password-guru', (req, res) => res.sendFile(path_1.default.join(__dirname, '../public/lupa-password-guru.html')));
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map