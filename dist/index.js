"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const socket_1 = require("./config/socket");
// Ensure data dir & uploads dir exist
const dataDir = path_1.default.join(__dirname, '../data');
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(dataDir))
    fs_1.default.mkdirSync(dataDir, { recursive: true });
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
// Create HTTP server + Socket.IO for real-time v0.2
const httpServer = http_1.default.createServer(app_1.default);
const io = (0, socket_1.initSocket)(httpServer);
exports.io = io;
httpServer.listen(env_1.env.PORT, '0.0.0.0', () => {
    console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║  🎓 AbsenSiswa Neo-Brutalist System v0.5                  ║
  ║  🚀 Fix Semua Fungsi: Profil Real, Tahun 2026, Lokasi    ║
  ║  🌐 Server: http://localhost:${env_1.env.PORT}                     ║
  ║  🔌 Socket.IO: ws://localhost:${env_1.env.PORT}/socket.io          ║
  ║  📅 Tahun: ${env_1.env.CURRENT_YEAR} - ${env_1.env.TAHUN_AJARAN} | ${env_1.env.SCHOOL_NAME}  ║
  ╠════════════════════════════════════════════════════════════╣
  ║  📖 API v0.5 - Fix Semua Fungsi:                         ║
  ║  - GET  /api/profile/me  (PROFIL REAL - FIX DATA LAMA)   ║
  ║  - GET  /api/profile/siswa/:id (Profil Murid Real)       ║
  ║  - PUT  /api/profile/me  (Edit Profil Real)              ║
  ║  - PUT  /api/settings  (GANTI LOKASI + TAHUN 2026)       ║
  ║  - PUT  /api/kelas/:id  (GANTI KELAS - FIX CACAT)        ║
  ║  - PUT  /api/siswa/:id  (pindah kelas)                   ║
  ╠════════════════════════════════════════════════════════════╣
  ║  🌐 Frontend v0.5 - Fix Data Lama:                       ║
  ║  - /profil          → Profil Real - Fix Data Lama     ║
  ║  - /setup           → Setup Tahun 2026 + Lokasi          ║
  ║  - /settings        → Settings Lokasi Dinamis            ║
  ║  - /kelas           → Kelola Kelas - Bisa Diganti        ║
  ║  - /                → Welcome v0.5 - 2026/2027 - Data 0  ║
  ║  - /dashboard/*     → Semua pakai data real API          ║
  ╚════════════════════════════════════════════════════════════╝

  🔧 v0.5 Fix Semua Fungsi Yang Belum Bekerja:
  - Profil murid data lama (Data Lama) → Real via /api/profile/me
  - Tahun 2024 → 2026 (tahun sekarang ${env_1.env.CURRENT_YEAR})
  - Lokasi Jakarta hardcode → Dinamis semua kota
  - Kelas bisa diganti - Fix cacat v0.3
  - Semua dashboard pakai data real dari API, bukan hardcoded
  - Data NOL - No Dummy - No Old Data - 100% Data Nyata

  ✅ v0.5 - Semua fungsi sekarang pakai data nyata real-time!
  `);
});
//# sourceMappingURL=index.js.map