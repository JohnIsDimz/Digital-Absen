"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nik_1 = require("../utils/nik");
const ocr_1 = require("../utils/ocr");
const db_1 = require("../config/db");
const auth_1 = require("../middlewares/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Multer untuk upload foto KTP
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, '../../uploads/ktp');
        if (!fs_1.default.existsSync(uploadPath))
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `ktp-${unique}-${file.originalname}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max untuk KTP
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowed.includes(file.mimetype))
            cb(null, true);
        else
            cb(new Error('Format file KTP harus JPG, PNG, atau WebP'));
    },
});
/**
 * POST /api/nik/validate
 * Validasi NIK tanpa auth (untuk form pendaftaran)
 */
router.post('/validate', (req, res) => {
    try {
        const { nik } = req.body;
        if (!nik) {
            return res.status(400).json({ success: false, message: 'NIK wajib diisi' });
        }
        const result = (0, nik_1.validateNIK)(nik);
        res.json({
            success: result.valid,
            message: result.valid ? 'NIK valid' : result.error,
            data: {
                ...result,
                formatted: (0, nik_1.formatNIK)(result.nik),
                masked: (0, nik_1.maskNIK)(result.nik),
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Gagal validasi NIK' });
    }
});
/**
 * POST /api/nik/verify
 * Verifikasi NIK dengan KTP (butuh auth) - Cek duplikat & simpan
 */
router.post('/verify', auth_1.authenticate, async (req, res) => {
    try {
        const { nik, siswaId } = req.body;
        const userId = req.user.id;
        if (!nik) {
            return res.status(400).json({ success: false, message: 'NIK wajib diisi' });
        }
        const result = (0, nik_1.validateNIK)(nik);
        if (!result.valid) {
            return res.status(400).json({ success: false, message: result.error, data: result });
        }
        const data = db_1.db.get();
        // Cek duplikat NIK di siswa lain
        const existingSiswa = data.siswa.find(s => s.nik === result.nik && s.id !== (siswaId || userId));
        if (existingSiswa) {
            return res.status(400).json({
                success: false,
                message: `NIK sudah terdaftar atas nama ${existingSiswa.nama}`,
                data: { duplicate: true, existingName: existingSiswa.nama },
            });
        }
        // Cek duplikat di guru
        const existingGuru = data.guru.find(g => g.nik === result.nik && g.id !== userId);
        if (existingGuru) {
            return res.status(400).json({
                success: false,
                message: `NIK sudah terdaftar sebagai guru ${existingGuru.nama}`,
            });
        }
        // Jika verifikasi untuk diri sendiri, update langsung
        if (req.user.role === 'SISWA') {
            const siswa = data.siswa.find(s => s.id === userId);
            if (siswa) {
                db_1.db.update(d => ({
                    ...d,
                    siswa: d.siswa.map(s => s.id === userId ? { ...s, nik: result.nik, nikVerified: true, nikVerifiedAt: new Date().toISOString() } : s),
                }));
            }
        }
        else {
            // Guru/Wali Kelas verifikasi siswa
            if (siswaId) {
                db_1.db.update(d => ({
                    ...d,
                    siswa: d.siswa.map(s => s.id === siswaId ? { ...s, nik: result.nik, nikVerified: true, nikVerifiedAt: new Date().toISOString(), nikVerifiedBy: userId } : s),
                }));
            }
            else {
                // Guru verifikasi NIK sendiri
                db_1.db.update(d => ({
                    ...d,
                    guru: d.guru.map(g => g.id === userId ? { ...g, nik: result.nik, nikVerified: true } : g),
                }));
            }
        }
        res.json({
            success: true,
            message: 'NIK berhasil diverifikasi dengan KTP',
            data: {
                ...result,
                formatted: (0, nik_1.formatNIK)(result.nik),
                masked: (0, nik_1.maskNIK)(result.nik),
                verified: true,
                verifiedAt: new Date().toISOString(),
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal verifikasi NIK' });
    }
});
/**
 * GET /api/nik/check/:nik
 * Cek NIK sudah terdaftar atau belum (untuk admin)
 */
router.get('/check/:nik', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), (req, res) => {
    try {
        const { nik } = req.params;
        const result = (0, nik_1.validateNIK)(nik);
        const data = db_1.db.get();
        const siswa = data.siswa.find(s => s.nik === result.nik);
        const guru = data.guru.find(g => g.nik === result.nik);
        res.json({
            success: true,
            data: {
                ...result,
                formatted: (0, nik_1.formatNIK)(result.nik),
                masked: (0, nik_1.maskNIK)(result.nik),
                registered: !!(siswa || guru),
                as: siswa ? { type: 'SISWA', nama: siswa.nama, kelasId: siswa.kelasId } : guru ? { type: 'GURU', nama: guru.nama } : null,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Gagal cek NIK' });
    }
});
/**
 * POST /api/nik/ocr
 * OCR Foto KTP otomatis extract NIK 16 digit - Biar user lebih mudah!
 * Bisa pakai tanpa login untuk cek, atau dengan login untuk langsung verifikasi
 */
router.post('/ocr', upload.single('ktp'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Foto KTP wajib diupload' });
        }
        const imagePath = req.file.path;
        console.log(`📸 OCR KTP: ${imagePath} - Mulai scan...`);
        // OCR dengan Tesseract.js
        const ocrResult = await (0, ocr_1.ocrKTPImage)(imagePath);
        if (!ocrResult.success) {
            // Hapus file jika gagal
            try {
                fs_1.default.unlinkSync(imagePath);
            }
            catch { }
            return res.status(500).json({ success: false, message: 'Gagal OCR KTP', error: ocrResult.error });
        }
        // Extract NIK
        const nik = ocrResult.nik;
        const allNIKs = ocrResult.allNIKs || [];
        if (!nik) {
            return res.json({
                success: false,
                message: 'NIK tidak ditemukan di foto KTP. Pastikan foto jelas, tidak blur, dan NIK terlihat.',
                data: {
                    text: ocrResult.text.substring(0, 500),
                    allNIKs,
                    confidence: ocrResult.confidence,
                    imagePath: `/uploads/ktp/${req.file.filename}`,
                },
            });
        }
        // Validasi NIK yang ter-extract
        const validation = (0, nik_1.validateNIK)(nik);
        res.json({
            success: true,
            message: validation.valid ? `NIK ditemukan otomatis via OCR: ${(0, nik_1.formatNIK)(nik)}` : `NIK terdeteksi tapi perlu cek: ${nik}`,
            data: {
                nik,
                formatted: (0, nik_1.formatNIK)(nik),
                masked: (0, nik_1.maskNIK)(nik),
                valid: validation.valid,
                provinsi: validation.provinsi,
                tanggalLahir: validation.tanggalLahir,
                jenisKelamin: validation.jenisKelamin,
                umur: validation.umur,
                error: validation.error,
                allNIKs,
                ocrText: ocrResult.text.substring(0, 1000),
                confidence: ocrResult.confidence,
                imagePath: `/uploads/ktp/${req.file.filename}`,
                imageUrl: `/uploads/ktp/${req.file.filename}`,
            },
        });
    }
    catch (err) {
        console.error('OCR Error:', err);
        res.status(500).json({ success: false, message: 'Gagal OCR KTP', error: err.message });
    }
});
/**
 * POST /api/nik/ocr-verify
 * OCR + langsung verifikasi (1 step) - Foto KTP → Extract NIK → Verifikasi → Simpan
 */
router.post('/ocr-verify', auth_1.authenticate, upload.single('ktp'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Foto KTP wajib diupload' });
        }
        const imagePath = req.file.path;
        const userId = req.user.id;
        const { siswaId } = req.body;
        console.log(`📸 OCR + Verify KTP: ${imagePath} untuk user ${userId}`);
        const ocrResult = await (0, ocr_1.ocrKTPImage)(imagePath);
        if (!ocrResult.success || !ocrResult.nik) {
            return res.status(400).json({
                success: false,
                message: ocrResult.nik ? 'NIK tidak valid' : 'NIK tidak ditemukan di foto KTP',
                data: {
                    ocrText: ocrResult.text?.substring(0, 500),
                    allNIKs: ocrResult.allNIKs,
                    imagePath: `/uploads/ktp/${req.file.filename}`,
                },
            });
        }
        const nik = ocrResult.nik;
        const validation = (0, nik_1.validateNIK)(nik);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: `NIK terdeteksi ${(0, nik_1.formatNIK)(nik)} tapi tidak valid: ${validation.error}`,
                data: { nik, formatted: (0, nik_1.formatNIK)(nik), validation, imagePath: `/uploads/ktp/${req.file.filename}` },
            });
        }
        // Cek duplikat
        const data = db_1.db.get();
        const existingSiswa = data.siswa.find(s => s.nik === nik && s.id !== (siswaId || userId));
        if (existingSiswa) {
            try {
                fs_1.default.unlinkSync(imagePath);
            }
            catch { }
            return res.status(400).json({ success: false, message: `NIK sudah terdaftar atas nama ${existingSiswa.nama}` });
        }
        // Simpan verifikasi
        if (req.user.role === 'SISWA') {
            db_1.db.update(d => ({
                ...d,
                siswa: d.siswa.map(s => s.id === userId ? { ...s, nik, nikVerified: true, nikVerifiedAt: new Date().toISOString(), ktpFotoPath: `/uploads/ktp/${req.file.filename}` } : s),
            }));
        }
        else {
            if (siswaId) {
                db_1.db.update(d => ({
                    ...d,
                    siswa: d.siswa.map(s => s.id === siswaId ? { ...s, nik, nikVerified: true, nikVerifiedAt: new Date().toISOString(), nikVerifiedBy: userId, ktpFotoPath: `/uploads/ktp/${req.file.filename}` } : s),
                }));
            }
            else {
                db_1.db.update(d => ({
                    ...d,
                    guru: d.guru.map(g => g.id === userId ? { ...g, nik, nikVerified: true, ktpFotoPath: `/uploads/ktp/${req.file.filename}` } : g),
                }));
            }
        }
        res.json({
            success: true,
            message: `NIK ${(0, nik_1.formatNIK)(nik)} berhasil diverifikasi otomatis via OCR KTP!`,
            data: {
                ...validation,
                nik,
                formatted: (0, nik_1.formatNIK)(nik),
                masked: (0, nik_1.maskNIK)(nik),
                verified: true,
                verifiedAt: new Date().toISOString(),
                ocrConfidence: ocrResult.confidence,
                imagePath: `/uploads/ktp/${req.file.filename}`,
                imageUrl: `/uploads/ktp/${req.file.filename}`,
            },
        });
    }
    catch (err) {
        console.error('OCR Verify Error:', err);
        res.status(500).json({ success: false, message: 'Gagal OCR + Verifikasi', error: err.message });
    }
});
/**
 * GET /api/nik/stats
 * Statistik verifikasi NIK (admin)
 */
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), (req, res) => {
    try {
        const data = db_1.db.get();
        const totalSiswa = data.siswa.length;
        const verifiedSiswa = data.siswa.filter(s => s.nikVerified).length;
        const totalGuru = data.guru.length;
        const verifiedGuru = data.guru.filter(g => g.nikVerified).length;
        res.json({
            success: true,
            data: {
                siswa: { total: totalSiswa, verified: verifiedSiswa, unverified: totalSiswa - verifiedSiswa, percent: totalSiswa ? Math.round((verifiedSiswa / totalSiswa) * 100) : 0 },
                guru: { total: totalGuru, verified: verifiedGuru, unverified: totalGuru - verifiedGuru, percent: totalGuru ? Math.round((verifiedGuru / totalGuru) * 100) : 0 },
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Gagal ambil stats NIK' });
    }
});
exports.default = router;
//# sourceMappingURL=nik.routes.js.map