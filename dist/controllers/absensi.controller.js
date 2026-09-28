"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputManual = exports.getMyAbsensi = exports.scanAbsen = void 0;
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const geofence_1 = require("../utils/geofence");
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const zod_1 = require("zod");
const socket_1 = require("../config/socket");
const scanSchema = zod_1.z.object({
    qrToken: zod_1.z.string().min(5),
    lat: zod_1.z.number(),
    lng: zod_1.z.number(),
    faceVerified: zod_1.z.boolean().optional().default(false),
    deviceId: zod_1.z.string().optional()
});
const scanAbsen = async (req, res) => {
    try {
        const { qrToken, lat, lng, faceVerified, deviceId } = scanSchema.parse(req.body);
        const siswaId = req.user.id;
        const data = db_1.db.get();
        const siswa = data.siswa.find(s => s.id === siswaId);
        if (!siswa)
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        // Anti titip absen: cek device
        if (siswa.deviceId && deviceId && siswa.deviceId !== deviceId) {
            return res.status(403).json({
                success: false,
                message: 'Perangkat tidak sesuai. 1 Perangkat untuk 1 Siswa (Anti Titip Absen).',
                code: 'DEVICE_MISMATCH'
            });
        }
        // Cari sesi by QR token
        const sesi = data.sesiAbsen.find(s => s.qrCode === qrToken);
        if (!sesi) {
            return res.status(404).json({ success: false, message: 'QR Code tidak valid atau sesi tidak ditemukan.' });
        }
        if (sesi.isLocked) {
            return res.status(403).json({ success: false, message: 'Sesi absen sudah dikunci oleh Wali Kelas.' });
        }
        // Cek expiry QR
        if ((0, dayjs_1.default)().isAfter((0, dayjs_1.default)(sesi.qrExpiresAt))) {
            return res.status(400).json({ success: false, message: 'QR Code expired. Minta Guru refresh QR.', code: 'QR_EXPIRED' });
        }
        // Cek geofence - FIX v0.5.4: pakai settings dinamis jika ada (Bandung/Surabaya), bukan hardcode Jakarta
        const schoolLat = data.settings?.lat || env_1.env.SCHOOL_LAT;
        const schoolLng = data.settings?.lng || env_1.env.SCHOOL_LNG;
        const schoolRadius = data.settings?.radiusMeter || env_1.env.GEOFENCE_RADIUS;
        const geo = (0, geofence_1.isWithinGeofence)(lat, lng, schoolLat, schoolLng, schoolRadius);
        if (!geo.inside) {
            return res.status(403).json({
                success: false,
                message: `Lokasi di luar radius sekolah. Jarak kamu ${geo.distance}m, maksimal ${schoolRadius}m. Sekolah di ${data.settings?.sekolahNama || env_1.env.SCHOOL_NAME} (${schoolLat},${schoolLng})`,
                data: { jarak: geo.distance, radius: schoolRadius, inside: false, sekolah: data.settings?.sekolahNama, lat: schoolLat, lng: schoolLng }
            });
        }
        // Cek sudah absen hari ini belum
        const today = (0, dayjs_1.default)().format('YYYY-MM-DD');
        const sudahAbsen = data.absensi.find(a => a.siswaId === siswaId && a.tanggal === today);
        if (sudahAbsen) {
            return res.status(400).json({ success: false, message: `Kamu sudah absen hari ini jam ${sudahAbsen.jamCheckin} - Status: ${sudahAbsen.status}`, data: sudahAbsen });
        }
        // Hitung status hadir / terlambat
        const now = (0, dayjs_1.default)();
        const jamNow = now.format('HH:mm:ss');
        const { status, terlambatMenit } = (0, geofence_1.getJamStatus)(jamNow, sesi.batasToleransi);
        const absensiBaru = {
            id: (0, uuid_1.v4)(),
            siswaId,
            sesiId: sesi.id,
            tanggal: today,
            jamCheckin: jamNow,
            jamCheckinFull: now.toISOString(),
            status: status,
            keterlambatanMenit: terlambatMenit,
            lokasi: {
                lat,
                lng,
                nama: 'Gerbang Utara Presensi',
                jarakMeter: geo.distance,
                isWithinGeofence: true
            },
            faceVerified: faceVerified || false,
            deviceId,
            createdAt: now.toISOString()
        };
        db_1.db.update(d => ({
            ...d,
            absensi: [...d.absensi, absensiBaru]
        }));
        // Real-time emit v0.2
        (0, socket_1.emitAbsensiBaru)(siswa.kelasId, absensiBaru, siswa);
        // Simulasi kirim WA Ortu - real akan pakai API
        console.log(`📱 WA Ortu Terkirim: ${siswa.nama} ${status} jam ${jamNow} - Jarak ${geo.distance}m - Real GPS: ${lat},${lng}`);
        res.json({
            success: true,
            message: status === 'HADIR' ? 'Absen berhasil! Kamu tepat waktu.' : `Absen berhasil! Terlambat ${terlambatMenit} menit. Poin -2`,
            data: {
                absensi: absensiBaru,
                siswa: { nama: siswa.nama, nisn: siswa.nisn, kelasId: siswa.kelasId },
                notifikasi: { waOrtu: 'Terkirim ✓✓', telegramWali: 'Terkirim' }
            }
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal absen' });
    }
};
exports.scanAbsen = scanAbsen;
const getMyAbsensi = async (req, res) => {
    try {
        const siswaId = req.user.id;
        const data = db_1.db.get();
        const list = data.absensi.filter(a => a.siswaId === siswaId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ success: true, data: list });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Gagal ambil absensi' });
    }
};
exports.getMyAbsensi = getMyAbsensi;
const inputManual = async (req, res) => {
    try {
        const { siswaId, status, tanggal, jamCheckin, keterangan } = req.body;
        const data = db_1.db.get();
        const siswa = data.siswa.find(s => s.id === siswaId);
        if (!siswa)
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        const today = tanggal || (0, dayjs_1.default)().format('YYYY-MM-DD');
        let sesi = data.sesiAbsen.find(s => s.kelasId === siswa.kelasId && s.tanggal === today);
        if (!sesi) {
            sesi = {
                id: (0, uuid_1.v4)(),
                kelasId: siswa.kelasId,
                tanggal: today,
                jamMasuk: env_1.env.JAM_MASUK,
                batasToleransi: env_1.env.BATAS_TOLERANSI,
                qrCode: (0, uuid_1.v4)(),
                qrPayload: '{}',
                qrExpiresAt: (0, dayjs_1.default)().add(1, 'day').toISOString(),
                isLocked: false,
                createdBy: req.user.id,
                createdAt: new Date().toISOString()
            };
            db_1.db.update(d => ({ ...d, sesiAbsen: [...d.sesiAbsen, sesi] }));
        }
        const schoolLat2 = data.settings?.lat || env_1.env.SCHOOL_LAT;
        const schoolLng2 = data.settings?.lng || env_1.env.SCHOOL_LNG;
        const absensiBaru = {
            id: (0, uuid_1.v4)(),
            siswaId,
            sesiId: sesi.id,
            tanggal: today,
            jamCheckin: jamCheckin || (0, dayjs_1.default)().format('HH:mm:ss'),
            jamCheckinFull: (0, dayjs_1.default)().toISOString(),
            status: status || 'HADIR',
            keterlambatanMenit: 0,
            lokasi: {
                lat: schoolLat2,
                lng: schoolLng2,
                nama: 'Input Manual Wali Kelas',
                jarakMeter: 0,
                isWithinGeofence: true
            },
            faceVerified: false,
            createdAt: new Date().toISOString()
        };
        db_1.db.update(d => ({
            ...d,
            absensi: [...d.absensi, absensiBaru]
        }));
        res.json({ success: true, message: `Absen manual untuk ${siswa.nama} berhasil dicatat: ${status}`, data: absensiBaru });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal input manual' });
    }
};
exports.inputManual = inputManual;
//# sourceMappingURL=absensi.controller.js.map