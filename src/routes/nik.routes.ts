import { Router } from 'express';
import { validateNIK, formatNIK, maskNIK } from '../utils/nik';
import { ocrKTPImage, extractNIKFromText } from '../utils/ocr';
import { db } from '../config/db';
import { authenticate, authorize } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Multer untuk upload foto KTP
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/ktp');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `ktp-${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max untuk KTP
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format file KTP harus JPG, PNG, atau WebP'));
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

    const result = validateNIK(nik);
    
    res.json({
      success: result.valid,
      message: result.valid ? 'NIK valid' : result.error,
      data: {
        ...result,
        formatted: formatNIK(result.nik),
        masked: maskNIK(result.nik),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal validasi NIK' });
  }
});

/**
 * POST /api/nik/verify
 * Verifikasi NIK dengan KTP (butuh auth) - Cek duplikat & simpan
 */
router.post('/verify', authenticate, async (req: any, res) => {
  try {
    const { nik, siswaId } = req.body;
    const userId = req.user.id;

    if (!nik) {
      return res.status(400).json({ success: false, message: 'NIK wajib diisi' });
    }

    const result = validateNIK(nik);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.error, data: result });
    }

    const data = db.get();
    
    // Cek duplikat NIK di siswa lain
    const existingSiswa = data.siswa.find(s => (s as any).nik === result.nik && s.id !== (siswaId || userId));
    if (existingSiswa) {
      return res.status(400).json({
        success: false,
        message: `NIK sudah terdaftar atas nama ${existingSiswa.nama}`,
        data: { duplicate: true, existingName: existingSiswa.nama },
      });
    }

    // Cek duplikat di guru
    const existingGuru = data.guru.find(g => (g as any).nik === result.nik && g.id !== userId);
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
        db.update(d => ({
          ...d,
          siswa: d.siswa.map(s => s.id === userId ? { ...s, nik: result.nik, nikVerified: true, nikVerifiedAt: new Date().toISOString() } as any : s),
        }));
      }
    } else {
      // Guru/Wali Kelas verifikasi siswa
      if (siswaId) {
        db.update(d => ({
          ...d,
          siswa: d.siswa.map(s => s.id === siswaId ? { ...s, nik: result.nik, nikVerified: true, nikVerifiedAt: new Date().toISOString(), nikVerifiedBy: userId } as any : s),
        }));
      } else {
        // Guru verifikasi NIK sendiri
        db.update(d => ({
          ...d,
          guru: d.guru.map(g => g.id === userId ? { ...g, nik: result.nik, nikVerified: true } as any : g),
        }));
      }
    }

    res.json({
      success: true,
      message: 'NIK berhasil diverifikasi dengan KTP',
      data: {
        ...result,
        formatted: formatNIK(result.nik),
        masked: maskNIK(result.nik),
        verified: true,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal verifikasi NIK' });
  }
});

/**
 * GET /api/nik/check/:nik
 * Cek NIK sudah terdaftar atau belum (untuk admin)
 */
router.get('/check/:nik', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), (req, res) => {
  try {
    const { nik } = req.params;
    const result = validateNIK(nik);
    const data = db.get();

    const siswa = data.siswa.find(s => (s as any).nik === result.nik);
    const guru = data.guru.find(g => (g as any).nik === result.nik);

    res.json({
      success: true,
      data: {
        ...result,
        formatted: formatNIK(result.nik),
        masked: maskNIK(result.nik),
        registered: !!(siswa || guru),
        as: siswa ? { type: 'SISWA', nama: siswa.nama, kelasId: siswa.kelasId } : guru ? { type: 'GURU', nama: guru.nama } : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal cek NIK' });
  }
});

/**
 * POST /api/nik/ocr
 * OCR Foto KTP otomatis extract NIK 16 digit - Biar user lebih mudah!
 * Bisa pakai tanpa login untuk cek, atau dengan login untuk langsung verifikasi
 */
router.post('/ocr', upload.single('ktp'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Foto KTP wajib diupload' });
    }

    const imagePath = req.file.path;
    console.log(`📸 OCR KTP: ${imagePath} - Mulai scan...`);

    // OCR dengan Tesseract.js
    const ocrResult = await ocrKTPImage(imagePath);

    if (!ocrResult.success) {
      // Hapus file jika gagal
      try { fs.unlinkSync(imagePath); } catch {}
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
    const validation = validateNIK(nik);

    res.json({
      success: true,
      message: validation.valid ? `NIK ditemukan otomatis via OCR: ${formatNIK(nik)}` : `NIK terdeteksi tapi perlu cek: ${nik}`,
      data: {
        nik,
        formatted: formatNIK(nik),
        masked: maskNIK(nik),
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
  } catch (err: any) {
    console.error('OCR Error:', err);
    res.status(500).json({ success: false, message: 'Gagal OCR KTP', error: err.message });
  }
});

/**
 * POST /api/nik/ocr-verify
 * OCR + langsung verifikasi (1 step) - Foto KTP → Extract NIK → Verifikasi → Simpan
 */
router.post('/ocr-verify', authenticate, upload.single('ktp'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Foto KTP wajib diupload' });
    }

    const imagePath = req.file.path;
    const userId = req.user.id;
    const { siswaId } = req.body;

    console.log(`📸 OCR + Verify KTP: ${imagePath} untuk user ${userId}`);

    const ocrResult = await ocrKTPImage(imagePath);

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
    const validation = validateNIK(nik);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: `NIK terdeteksi ${formatNIK(nik)} tapi tidak valid: ${validation.error}`,
        data: { nik, formatted: formatNIK(nik), validation, imagePath: `/uploads/ktp/${req.file.filename}` },
      });
    }

    // Cek duplikat
    const data = db.get();
    const existingSiswa = data.siswa.find(s => (s as any).nik === nik && s.id !== (siswaId || userId));
    if (existingSiswa) {
      try { fs.unlinkSync(imagePath); } catch {}
      return res.status(400).json({ success: false, message: `NIK sudah terdaftar atas nama ${existingSiswa.nama}` });
    }

    // Simpan verifikasi
    if (req.user.role === 'SISWA') {
      db.update(d => ({
        ...d,
        siswa: d.siswa.map(s => s.id === userId ? { ...s, nik, nikVerified: true, nikVerifiedAt: new Date().toISOString(), ktpFotoPath: `/uploads/ktp/${req.file.filename}` } as any : s),
      }));
    } else {
      if (siswaId) {
        db.update(d => ({
          ...d,
          siswa: d.siswa.map(s => s.id === siswaId ? { ...s, nik, nikVerified: true, nikVerifiedAt: new Date().toISOString(), nikVerifiedBy: userId, ktpFotoPath: `/uploads/ktp/${req.file.filename}` } as any : s),
        }));
      } else {
        db.update(d => ({
          ...d,
          guru: d.guru.map(g => g.id === userId ? { ...g, nik, nikVerified: true, ktpFotoPath: `/uploads/ktp/${req.file.filename}` } as any : g),
        }));
      }
    }

    res.json({
      success: true,
      message: `NIK ${formatNIK(nik)} berhasil diverifikasi otomatis via OCR KTP!`,
      data: {
        ...validation,
        nik,
        formatted: formatNIK(nik),
        masked: maskNIK(nik),
        verified: true,
        verifiedAt: new Date().toISOString(),
        ocrConfidence: ocrResult.confidence,
        imagePath: `/uploads/ktp/${req.file.filename}`,
        imageUrl: `/uploads/ktp/${req.file.filename}`,
      },
    });
  } catch (err: any) {
    console.error('OCR Verify Error:', err);
    res.status(500).json({ success: false, message: 'Gagal OCR + Verifikasi', error: err.message });
  }
});

/**
 * GET /api/nik/stats
 * Statistik verifikasi NIK (admin)
 */
router.get('/stats', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), (req, res) => {
  try {
    const data = db.get();
    const totalSiswa = data.siswa.length;
    const verifiedSiswa = data.siswa.filter(s => (s as any).nikVerified).length;
    const totalGuru = data.guru.length;
    const verifiedGuru = data.guru.filter(g => (g as any).nikVerified).length;

    res.json({
      success: true,
      data: {
        siswa: { total: totalSiswa, verified: verifiedSiswa, unverified: totalSiswa - verifiedSiswa, percent: totalSiswa ? Math.round((verifiedSiswa / totalSiswa) * 100) : 0 },
        guru: { total: totalGuru, verified: verifiedGuru, unverified: totalGuru - verifiedGuru, percent: totalGuru ? Math.round((verifiedGuru / totalGuru) * 100) : 0 },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal ambil stats NIK' });
  }
});

export default router;
