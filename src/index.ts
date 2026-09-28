import app from './app';
import { env } from './config/env';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { initSocket } from './config/socket';

// Ensure data dir & uploads dir exist
const dataDir = path.join(__dirname, '../data');
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Create HTTP server + Socket.IO for real-time v0.2
const httpServer = http.createServer(app);
const io = initSocket(httpServer);

httpServer.listen(env.PORT, '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║  🎓 AbsenSiswa Neo-Brutalist System v0.5                  ║
  ║  🚀 Fix Semua Fungsi: Profil Real, Tahun 2026, Lokasi    ║
  ║  🌐 Server: http://localhost:${env.PORT}                     ║
  ║  🔌 Socket.IO: ws://localhost:${env.PORT}/socket.io          ║
  ║  📅 Tahun: ${env.CURRENT_YEAR} - ${env.TAHUN_AJARAN} | ${env.SCHOOL_NAME}  ║
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
  - Tahun 2024 → 2026 (tahun sekarang ${env.CURRENT_YEAR})
  - Lokasi Jakarta hardcode → Dinamis semua kota
  - Kelas bisa diganti - Fix cacat v0.3
  - Semua dashboard pakai data real dari API, bukan hardcoded
  - Data NOL - No Dummy - No Old Data - 100% Data Nyata

  ✅ v0.5 - Semua fungsi sekarang pakai data nyata real-time!
  `);
});

export { io };
