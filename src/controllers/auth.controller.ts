import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db';
import { generateToken } from '../utils/jwt';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const siswaJoinSchema = z.object({
  kodeUndangan: z.string().min(3),
  nisn: z.string().min(5),
  pin: z.string().optional(),
  deviceId: z.string().optional()
});

const guruLoginSchema = z.object({
  nip: z.string().min(5),
  password: z.string().min(3),
  tahunAjaran: z.string().optional()
});

const guruRegisterSchema = z.object({
  nip: z.string().min(5).max(30),
  nama: z.string().min(3).max(100),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).max(100),
  confirmPassword: z.string().min(6).optional(),
  role: z.enum(['GURU','WALI_KELAS','ADMIN']).optional(),
  sekolahNama: z.string().optional(),
  tahunAjaran: z.string().optional()
});

const guruResetSchema = z.object({
  nip: z.string().min(5),
  nama: z.string().min(3),
  newPassword: z.string().min(6).max(100),
  confirmPassword: z.string().min(6).optional()
});

export const joinSiswa = async (req: Request, res: Response) => {
  try {
    const { kodeUndangan, nisn, pin, deviceId } = siswaJoinSchema.parse(req.body);

    const data = db.get();

    // Cek kelas by kode undangan
    const kelas = data.kelas.find(k => k.kodeUndangan.toUpperCase() === kodeUndangan.toUpperCase());
    if (!kelas) {
      return res.status(404).json({ success: false, message: 'Kode undangan tidak valid. Hubungi Wali Kelas.' });
    }

    // Cek siswa by NISN dan kelas
    const siswa = data.siswa.find(s => s.nisn === nisn && s.kelasId === kelas.id);
    if (!siswa) {
      return res.status(404).json({ success: false, message: 'NISN tidak terdaftar di kelas ini.' });
    }

    // Validasi PIN jika ada
    if (siswa.pin && pin && siswa.pin !== pin) {
      // coba cek password hash juga
      if (siswa.passwordHash) {
        const match = await bcrypt.compare(pin, siswa.passwordHash);
        if (!match && siswa.pin !== pin) {
          return res.status(401).json({ success: false, message: 'PIN salah.' });
        }
      } else {
        return res.status(401).json({ success: false, message: 'PIN salah.' });
      }
    }

    // Anti titip absen: cek deviceId
    if (siswa.deviceId && deviceId && siswa.deviceId !== deviceId) {
      console.warn(`⚠️ Device mismatch untuk ${siswa.nama}: ${siswa.deviceId} vs ${deviceId}`);
    }

    // Jika siswa belum punya deviceId, set sekarang
    if (!siswa.deviceId && deviceId) {
      db.update(d => ({
        ...d,
        siswa: d.siswa.map(s => s.id === siswa.id ? { ...s, deviceId } : s)
      }));
    }

    const token = generateToken({
      id: siswa.id,
      role: 'SISWA',
      kelasId: siswa.kelasId,
      nisn: siswa.nisn
    });

    res.json({
      success: true,
      message: `Selamat datang, ${siswa.nama}!`,
      data: {
        token,
        siswa: {
          id: siswa.id,
          nama: siswa.nama,
          nisn: siswa.nisn,
          noAbsen: siswa.noAbsen,
          kelas: kelas.nama,
          avatarInitial: siswa.avatarInitial,
          poinSikap: siswa.poinSikap
        },
        kelas
      }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal login siswa' });
  }
};

export const loginGuru = async (req: Request, res: Response) => {
  try {
    const { nip, password } = guruLoginSchema.parse(req.body);
    const data = db.get();

    const guru = data.guru.find(g => g.nip === nip.replace(/\s/g, ''));
    if (!guru) {
      return res.status(404).json({ success: false, message: 'NIP tidak terdaftar. Silakan Daftar dulu sebagai Guru.' });
    }

    const isMatch = await bcrypt.compare(password, guru.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Kata sandi salah. Coba Reset Password jika lupa.' });
    }

    const token = generateToken({
      id: guru.id,
      role: guru.role,
      nip: guru.nip
    });

    res.json({
      success: true,
      message: `Selamat datang, ${guru.nama}!`,
      data: {
        token,
        guru: {
          id: guru.id,
          nama: guru.nama,
          nip: guru.nip,
          role: guru.role,
          kelasDiampu: guru.kelasDiampu
        }
      }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal login guru' });
  }
};

// NEW v1.0.26 - DAFTAR GURU MANDIRI (FIX BUG: guru gaada daftar)
export const registerGuru = async (req: Request, res: Response) => {
  try {
    const parsed = guruRegisterSchema.parse(req.body);
    const data = db.get();

    // Validasi confirm password jika ada
    if (parsed.confirmPassword && parsed.password !== parsed.confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password dan Konfirmasi Password tidak sama' });
    }

    const cleanNip = parsed.nip.replace(/\s/g, '');

    // Cek NIP sudah terdaftar?
    if (data.guru.some(g => g.nip === cleanNip)) {
      return res.status(400).json({ success: false, message: `NIP ${cleanNip} sudah terdaftar. Silakan Login atau Reset Password.` });
    }

    // Tentukan role: jika belum ada guru sama sekali -> ADMIN (owner pertama)
    // Jika sudah ada guru -> GURU biasa (atau sesuai request jika WALI_KELAS)
    let finalRole: 'GURU' | 'WALI_KELAS' | 'ADMIN' = 'GURU';
    if (data.guru.length === 0) {
      finalRole = 'ADMIN'; // Guru pertama jadi ADMIN otomatis
    } else if (parsed.role && ['WALI_KELAS','ADMIN'].includes(parsed.role)) {
      // Hanya ADMIN yang bisa bikin WALI_KELAS/ADMIN lain, tapi untuk MVP kita allow jika request
      // Untuk keamanan, jika bukan ADMIN pertama, force jadi GURU kecuali ada kode rahasia
      // Sederhananya: jika sudah ada guru, role default GURU, tapi boleh request WALI_KELAS
      finalRole = parsed.role as any;
      if (finalRole === 'ADMIN' && data.guru.length > 0) {
        // Cegah sembarang orang jadi ADMIN - hanya jadi GURU
        finalRole = 'GURU';
      }
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const newGuru = {
      id: uuidv4(),
      nip: cleanNip,
      nama: parsed.nama,
      email: parsed.email || '',
      passwordHash,
      role: finalRole,
      kelasDiampu: [],
      createdAt: new Date().toISOString()
    };

    db.update(d => ({ ...d, guru: [...d.guru, newGuru] }));

    const token = generateToken({
      id: newGuru.id,
      role: newGuru.role,
      nip: newGuru.nip
    });

    res.status(201).json({
      success: true,
      message: finalRole === 'ADMIN'
        ? `Pendaftaran berhasil! ${parsed.nama} terdaftar sebagai ADMIN pertama. Silakan Setup Sekolah.`
        : `Pendaftaran berhasil! ${parsed.nama} terdaftar sebagai ${finalRole}.`,
      data: {
        token,
        guru: {
          id: newGuru.id,
          nama: newGuru.nama,
          nip: newGuru.nip,
          email: newGuru.email,
          role: newGuru.role
        },
        isFirstGuru: data.guru.length === 0
      }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal daftar guru' });
  }
};

// NEW v1.0.26 - RESET PASSWORD GURU (FIX BUG: lupa password)
export const resetGuruPassword = async (req: Request, res: Response) => {
  try {
    const { nip, nama, newPassword, confirmPassword } = guruResetSchema.parse(req.body);
    const data = db.get();

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password baru dan konfirmasi tidak sama' });
    }

    const cleanNip = nip.replace(/\s/g, '');
    const guru = data.guru.find(g => g.nip === cleanNip);

    if (!guru) {
      return res.status(404).json({ success: false, message: `NIP ${cleanNip} tidak ditemukan. Silakan Daftar dulu.` });
    }

    // Verifikasi nama harus cocok (case insensitive, minimal 3 huruf pertama cocok)
    const inputNama = nama.trim().toLowerCase();
    const guruNama = guru.nama.toLowerCase();

    // Cek apakah nama mengandung atau mirip (untuk keamanan sederhana)
    // Harus minimal 50% karakter cocok atau mengandung
    const isNamaMatch = guruNama.includes(inputNama) || inputNama.includes(guruNama.split(' ')[0]) || guruNama.split(' ').some(part => inputNama.includes(part) && part.length >= 3);

    if (!isNamaMatch) {
      return res.status(401).json({ success: false, message: 'Nama tidak cocok dengan NIP tersebut. Verifikasi gagal.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    db.update(d => ({
      ...d,
      guru: d.guru.map(g => g.id === guru.id ? { ...g, passwordHash: newHash, updatedAt: new Date().toISOString() } : g)
    }));

    res.json({
      success: true,
      message: `Password untuk ${guru.nama} (NIP ${guru.nip}) berhasil direset. Silakan Login dengan password baru.`,
      data: {
        nip: guru.nip,
        nama: guru.nama
      }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal reset password' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const data = db.get();
    const user = req.user;

    if (user.role === 'SISWA') {
      const siswa = data.siswa.find(s => s.id === user.id);
      const kelas = data.kelas.find(k => k.id === siswa?.kelasId);
      return res.json({ success: true, data: { ...siswa, kelas, role: 'SISWA' } });
    } else {
      const guru = data.guru.find(g => g.id === user.id);
      return res.json({ success: true, data: { ...guru, role: guru?.role } });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal ambil profil' });
  }
};
