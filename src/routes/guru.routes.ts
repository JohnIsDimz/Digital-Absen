import { Router } from 'express';
import { db } from '../config/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getIO } from '../config/socket';

const router = Router();

const guruRealSchema = z.object({
  nip: z.string().min(5),
  nama: z.string().min(3),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6),
  role: z.enum(['WALI_KELAS', 'GURU', 'ADMIN']).default('GURU'),
  kelasDiampu: z.array(z.string()).optional(),
});

const guruUpdateSchema = z.object({
  nip: z.string().min(5).optional(),
  nama: z.string().min(3).optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).optional(),
  role: z.enum(['WALI_KELAS', 'GURU', 'ADMIN']).optional(),
  kelasDiampu: z.array(z.string()).optional(), // FIX CACAT v0.3 - KELAS BISA DIGANTI untuk guru
});

router.get('/', (req, res) => {
  const data = db.get();
  res.json({
    success: true,
    version: '0.3.0 - Kelas Bisa Diganti',
    data: data.guru.map(g => ({
      id: g.id,
      nip: g.nip,
      nama: g.nama,
      email: g.email,
      role: g.role,
      kelasDiampu: g.kelasDiampu?.map(id => {
        const k = data.kelas.find(k => k.id === id);
        return k ? { id: k.id, nama: k.nama } : { id, nama: 'Unknown' };
      }),
      createdAt: g.createdAt
    })),
    total: data.guru.length
  });
});

router.post('/', async (req, res) => {
  try {
    const parsed = guruRealSchema.parse(req.body);
    const data = db.get();
    if (data.guru.some(g => g.nip === parsed.nip)) return res.status(400).json({ success: false, message: `NIP ${parsed.nip} sudah terdaftar` });
    if (parsed.kelasDiampu) {
      for (const kelasId of parsed.kelasDiampu) {
        if (!data.kelas.some(k => k.id === kelasId)) return res.status(404).json({ success: false, message: `Kelas ID ${kelasId} tidak ditemukan` });
      }
    }
    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const newGuru = {
      id: uuidv4(),
      nip: parsed.nip,
      nama: parsed.nama,
      email: parsed.email || '',
      passwordHash,
      role: parsed.role,
      kelasDiampu: parsed.kelasDiampu || [],
      createdAt: new Date().toISOString()
    };
    db.update(d => ({ ...d, guru: [...d.guru, newGuru] }));
    try {
      const io = getIO();
      io.emit('guru:baru', { guru: { id: newGuru.id, nama: newGuru.nama, nip: newGuru.nip } });
    } catch {}
    res.status(201).json({ success: true, message: `Guru real ${newGuru.nama} ditambahkan - Kelas bisa diganti v0.3`, data: { id: newGuru.id, nip: newGuru.nip, nama: newGuru.nama, role: newGuru.role } });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal tambah guru' });
  }
});

router.get('/:id', (req, res) => {
  const data = db.get();
  const guru = data.guru.find(g => g.id === req.params.id);
  if (!guru) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
  const kelas = data.kelas.filter(k => guru.kelasDiampu?.includes(k.id));
  res.json({ success: true, data: { id: guru.id, nip: guru.nip, nama: guru.nama, email: guru.email, role: guru.role, kelasDiampu: kelas } });
});

// PUT update guru - FIX CACAT v0.3 - KELAS BISA DIGANTI untuk guru
router.put('/:id', async (req, res) => {
  try {
    const parsed = guruUpdateSchema.parse(req.body);
    const data = db.get();
    const guru = data.guru.find(g => g.id === req.params.id);
    if (!guru) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });

    if (parsed.nip && parsed.nip !== guru.nip) {
      if (data.guru.some(g => g.nip === parsed.nip && g.id !== guru.id)) return res.status(400).json({ success: false, message: `NIP ${parsed.nip} sudah dipakai guru lain` });
    }

    if (parsed.kelasDiampu) {
      for (const kelasId of parsed.kelasDiampu) {
        if (!data.kelas.some(k => k.id === kelasId)) return res.status(404).json({ success: false, message: `Kelas ID ${kelasId} tidak ditemukan` });
      }
    }

    let passwordHash = guru.passwordHash;
    if (parsed.password) passwordHash = await bcrypt.hash(parsed.password, 10);

    const updatedGuru = {
      ...guru,
      nip: parsed.nip || guru.nip,
      nama: parsed.nama || guru.nama,
      email: parsed.email !== undefined ? parsed.email : guru.email,
      passwordHash,
      role: parsed.role || guru.role,
      kelasDiampu: parsed.kelasDiampu !== undefined ? parsed.kelasDiampu : guru.kelasDiampu,
      updatedAt: new Date().toISOString()
    };

    db.update(d => ({
      ...d,
      guru: d.guru.map(g => g.id === req.params.id ? updatedGuru : g),
      // Update waliKelasId di kelas jika guru ini wali dan kelasDiampu berubah
      kelas: d.kelas.map(k => {
        // Jika kelas sebelumnya diampu guru ini tapi sekarang tidak, hapus wali
        if (k.waliKelasId === guru.id && parsed.kelasDiampu && !parsed.kelasDiampu.includes(k.id)) {
          return { ...k, waliKelasId: null };
        }
        // Jika kelas baru diampu dan belum ada wali, set guru ini jadi wali (opsional)
        return k;
      })
    }));

    try {
      const io = getIO();
      io.emit('guru:update', { guru: { id: updatedGuru.id, nama: updatedGuru.nama, kelasDiampu: updatedGuru.kelasDiampu }, type: parsed.kelasDiampu ? 'GANTI_KELAS' : 'UPDATE_DATA' });
    } catch {}

    res.json({
      success: true,
      message: parsed.kelasDiampu ? `Guru ${guru.nama} berhasil ganti kelas diampu - Fix cacat v0.3` : `Guru ${guru.nama} diupdate`,
      data: {
        before: { nama: guru.nama, kelasDiampu: guru.kelasDiampu },
        after: { nama: updatedGuru.nama, kelasDiampu: updatedGuru.kelasDiampu },
        changed: Object.keys(parsed)
      }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal update guru' });
  }
});

router.delete('/:id', (req, res) => {
  const data = db.get();
  const guru = data.guru.find(g => g.id === req.params.id);
  if (!guru) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
  db.update(d => ({ ...d, guru: d.guru.filter(g => g.id !== req.params.id), kelas: d.kelas.map(k => k.waliKelasId === guru.id ? { ...k, waliKelasId: null } : k) }));
  try {
    const io = getIO();
    io.emit('guru:hapus', { guruId: guru.id, nama: guru.nama });
  } catch {}
  res.json({ success: true, message: `Guru ${guru.nama} dihapus` });
});

export default router;
