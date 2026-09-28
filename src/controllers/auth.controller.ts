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
      // Jika device berbeda, tolak (1 device 1 siswa)
      // Untuk demo, kita kasih warning tapi tetap izinkan dengan log
      console.warn(`⚠️ Device mismatch untuk ${siswa.nama}: ${siswa.deviceId} vs ${deviceId}`);
      // Uncomment untuk enforce ketat:
      // return res.status(403).json({ success: false, message: 'Perangkat tidak sesuai. 1 Perangkat untuk 1 Siswa (Anti Titip Absen).', code: 'DEVICE_MISMATCH' });
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
      return res.status(404).json({ success: false, message: 'NIP tidak terdaftar di Dapodik.' });
    }

    const isMatch = await bcrypt.compare(password, guru.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Kata sandi salah.' });
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
