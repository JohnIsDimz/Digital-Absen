"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// v0.4 - Tahun dinamis 2026 (tahun sekarang)
const now = new Date();
const currentYear = now.getFullYear(); // 2026
const nextYear = currentYear + 1; // 2027
exports.env = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'absensiswa-v04-2026-secret',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    // v0.4 - Lokasi Dinamis - Bisa untuk semua kota/daerah, bukan cuma Jakarta
    SCHOOL_NAME: process.env.SCHOOL_NAME || 'SMK NEGERI 1 JAKARTA',
    SCHOOL_LAT: parseFloat(process.env.SCHOOL_LAT || '-6.182339'),
    SCHOOL_LNG: parseFloat(process.env.SCHOOL_LNG || '106.832'),
    SCHOOL_ADDRESS: process.env.SCHOOL_ADDRESS || 'Jl. Budi Utomo No. 7, Sawah Besar, Jakarta Pusat',
    GEOFENCE_RADIUS: parseInt(process.env.GEOFENCE_RADIUS_METERS || '50', 10),
    // v0.4 - Tahun Ajaran Dinamis - Update ke 2026 (tahun sekarang)
    TAHUN_AJARAN: process.env.TAHUN_AJARAN || `${currentYear}/${nextYear}`, // 2026/2027
    SEMESTER: process.env.SEMESTER || 'GANJIL',
    QR_REFRESH_SECONDS: parseInt(process.env.QR_REFRESH_SECONDS || '30', 10),
    JAM_MASUK: process.env.JAM_MASUK || '07:00',
    BATAS_TOLERANSI: process.env.BATAS_TOLERANSI || '07:15',
    isDev: (process.env.NODE_ENV || 'development') === 'development',
    CURRENT_YEAR: currentYear,
    NEXT_YEAR: nextYear
};
//# sourceMappingURL=env.js.map