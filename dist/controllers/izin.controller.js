"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllIzin = exports.approveIzin = exports.getPendingIzin = exports.getMyIzin = exports.ajukanIzin = void 0;
const db_1 = require("../config/db");
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const zod_1 = require("zod");
const socket_1 = require("../config/socket");
const izinSchema = zod_1.z.object({
    kategori: zod_1.z.enum(['SAKIT', 'IZIN_PRIBADI', 'DISPENSASI', 'IZIN', 'SAKIT_RINGAN']).or(zod_1.z.string()).optional(),
    jenis: zod_1.z.enum(['SAKIT', 'IZIN_PRIBADI', 'DISPENSASI', 'IZIN']).or(zod_1.z.string()).optional(),
    tglMulai: zod_1.z.string().optional(),
    tglSelesai: zod_1.z.string().optional(),
    tanggalMulai: zod_1.z.string().optional(),
    tanggalSelesai: zod_1.z.string().optional(),
    alasan: zod_1.z.string().min(5),
}).refine((data) => data.kategori || data.jenis, { message: "kategori/jenis wajib", path: ["kategori"] })
    .refine((data) => data.tglMulai || data.tanggalMulai, { message: "tglMulai wajib", path: ["tglMulai"] })
    .refine((data) => data.tglSelesai || data.tanggalSelesai, { message: "tglSelesai wajib", path: ["tglSelesai"] });
const ajukanIzin = async (req, res) => {
    try {
        const parsed = izinSchema.parse(req.body);
        // Support both mobile (jenis, tanggalMulai) and web (kategori, tglMulai)
        const kategoriRaw = (parsed.kategori || parsed.jenis || 'IZIN');
        const kategoriMap = { 'IZIN': 'IZIN_PRIBADI', 'SAKIT': 'SAKIT', 'SAKIT_RINGAN': 'SAKIT', 'DISPENSASI': 'DISPENSASI', 'IZIN_PRIBADI': 'IZIN_PRIBADI' };
        const kategori = kategoriMap[kategoriRaw.toUpperCase()] || 'IZIN_PRIBADI';
        const tglMulai = parsed.tglMulai || parsed.tanggalMulai;
        const tglSelesai = parsed.tglSelesai || parsed.tanggalSelesai;
        const alasan = parsed.alasan;
        const siswaId = req.user.id;
        const data = db_1.db.get();
        const siswa = data.siswa.find(s => s.id === siswaId);
        if (!siswa)
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        const mulai = (0, dayjs_1.default)(tglMulai);
        const selesai = (0, dayjs_1.default)(tglSelesai);
        const durasi = selesai.diff(mulai, 'day') + 1;
        if (durasi <= 0) {
            return res.status(400).json({ success: false, message: 'Tanggal selesai harus setelah tanggal mulai' });
        }
        // File bukti jika ada (multer)
        let fileBukti;
        if (req.file) {
            const file = req.file;
            fileBukti = {
                originalName: file.originalname,
                path: `/uploads/${file.filename}`,
                size: file.size,
                mimetype: file.mimetype
            };
        }
        // Validasi wajib surat dokter untuk sakit >1 hari
        if (kategori === 'SAKIT' && durasi > 1 && !fileBukti) {
            return res.status(400).json({ success: false, message: 'Wajib upload surat dokter untuk sakit >1 hari' });
        }
        const izinBaru = {
            id: (0, uuid_1.v4)(),
            siswaId,
            kategori,
            tglMulai: mulai.format('YYYY-MM-DD'),
            tglSelesai: selesai.format('YYYY-MM-DD'),
            durasiHari: durasi,
            alasan,
            fileBukti,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };
        db_1.db.update(d => ({
            ...d,
            izin: [...d.izin, izinBaru]
        }));
        // Real-time v0.2
        (0, socket_1.emitIzinBaru)(siswa.kelasId, izinBaru, siswa);
        console.log(`📩 Izin baru real: ${siswa.nama} - ${kategori} ${durasi} hari - Real-time emit`);
        res.status(201).json({
            success: true,
            message: 'Pengajuan izin berhasil dikirim. Menunggu persetujuan Wali Kelas.',
            data: izinBaru
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal ajukan izin' });
    }
};
exports.ajukanIzin = ajukanIzin;
const getMyIzin = async (req, res) => {
    try {
        const siswaId = req.user.id;
        const data = db_1.db.get();
        const list = data.izin.filter(i => i.siswaId === siswaId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ success: true, data: list });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Gagal ambil izin' });
    }
};
exports.getMyIzin = getMyIzin;
const getPendingIzin = async (req, res) => {
    try {
        const data = db_1.db.get();
        const guru = data.guru.find(g => g.id === req.user.id);
        const kelasIds = guru?.kelasDiampu || data.kelas.map(k => k.id);
        const siswaInKelas = data.siswa.filter(s => kelasIds.includes(s.kelasId)).map(s => s.id);
        const pending = data.izin.filter(i => siswaInKelas.includes(i.siswaId) && i.status === 'PENDING')
            .map(i => ({
            ...i,
            siswa: data.siswa.find(s => s.id === i.siswaId)
        }))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        res.json({ success: true, data: pending, total: pending.length });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Gagal ambil pending izin' });
    }
};
exports.getPendingIzin = getPendingIzin;
const approveIzin = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, catatanGuru } = req.body; // DISETUJUI / DITOLAK
        if (!['DISETUJUI', 'DITOLAK'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status harus DISETUJUI atau DITOLAK' });
        }
        const data = db_1.db.get();
        const izin = data.izin.find(i => i.id === id);
        if (!izin)
            return res.status(404).json({ success: false, message: 'Pengajuan izin tidak ditemukan' });
        db_1.db.update(d => ({
            ...d,
            izin: d.izin.map(i => i.id === id ? {
                ...i,
                status,
                approvedBy: req.user.id,
                approvedAt: new Date().toISOString(),
                catatanGuru
            } : i)
        }));
        // Real-time emit approved
        const updatedIzin = { ...izin, status, approvedBy: req.user.id, approvedAt: new Date().toISOString() };
        (0, socket_1.emitIzinApproved)(izin.siswaId, updatedIzin);
        // Jika disetujui, buat absensi otomatis dengan status sesuai kategori
        if (status === 'DISETUJUI') {
            const siswa = data.siswa.find(s => s.id === izin.siswaId);
            if (siswa) {
                const statusAbsen = izin.kategori === 'SAKIT' ? 'SAKIT' : izin.kategori === 'DISPENSASI' ? 'DISPENSASI' : 'IZIN';
                // Buat absensi untuk setiap hari dalam rentang
                const mulai = (0, dayjs_1.default)(izin.tglMulai);
                const selesai = (0, dayjs_1.default)(izin.tglSelesai);
                const newAbsensi = [];
                for (let d = mulai; d.isBefore(selesai) || d.isSame(selesai, 'day'); d = d.add(1, 'day')) {
                    const tanggal = d.format('YYYY-MM-DD');
                    const sesi = data.sesiAbsen.find(s => s.kelasId === siswa.kelasId && s.tanggal === tanggal);
                    if (!sesi)
                        continue;
                    // Cek jika sudah ada absensi hari itu, skip
                    const existing = data.absensi.find(a => a.siswaId === siswa.id && a.tanggal === tanggal);
                    if (existing)
                        continue;
                    newAbsensi.push({
                        id: (0, uuid_1.v4)(),
                        siswaId: siswa.id,
                        sesiId: sesi.id,
                        tanggal,
                        jamCheckin: '00:00:00',
                        jamCheckinFull: d.toISOString(),
                        status: statusAbsen,
                        keterlambatanMenit: 0,
                        lokasi: {
                            lat: 0,
                            lng: 0,
                            nama: `Izin ${izin.kategori} - Disetujui Wali Kelas`,
                            jarakMeter: 0,
                            isWithinGeofence: true
                        },
                        faceVerified: false,
                        createdAt: new Date().toISOString()
                    });
                }
                if (newAbsensi.length > 0) {
                    db_1.db.update(d => ({
                        ...d,
                        absensi: [...d.absensi, ...newAbsensi]
                    }));
                }
            }
        }
        res.json({ success: true, message: `Izin berhasil ${status === 'DISETUJUI' ? 'disetujui' : 'ditolak'}`, data: { id, status } });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal approve izin' });
    }
};
exports.approveIzin = approveIzin;
const getAllIzin = async (req, res) => {
    try {
        const data = db_1.db.get();
        const list = data.izin.map(i => ({
            ...i,
            siswa: data.siswa.find(s => s.id === i.siswaId)
        })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ success: true, data: list });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Gagal ambil semua izin' });
    }
};
exports.getAllIzin = getAllIzin;
//# sourceMappingURL=izin.controller.js.map