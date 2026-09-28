import { Router } from 'express';
import { db } from '../config/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getIO } from '../config/socket';

const router = Router();

// Schema untuk data nyata - bukan dummy
const kelasSchema = z.object({
  nama: z.string().min(3),
  tahunAjaran: z.string().min(4),
  semester: z.enum(['GANJIL', 'GENAP']),
  kodeUndangan: z.string().min(3).optional(),
  waliKelasNama: z.string().optional(),
  waliKelasNip: z.string().optional(),
});

const kelasUpdateSchema = z.object({
  nama: z.string().min(3).optional(),
  tahunAjaran: z.string().min(4).optional(),
  semester: z.enum(['GANJIL', 'GENAP']).optional(),
  kodeUndangan: z.string().min(3).optional(),
  waliKelasId: z.string().optional().nullable(),
});

const generateKodeUndangan = (namaKelas: string): string => {
  const prefix = namaKelas.replace(/\s+/g, '').substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
};

// GET semua kelas - real data
router.get('/', (req, res) => {
  const data = db.get();
  res.json({
    success: true,
    version: '0.3.0 - Kelas Bisa Diganti - Fix Cacat',
    data: data.kelas.map(k => ({
      ...k,
      totalSiswaReal: data.siswa.filter(s => s.kelasId === k.id).length,
      waliKelas: data.guru.find(g => g.id === k.waliKelasId)
    })),
    total: data.kelas.length,
    message: data.kelas.length === 0 ? 'Belum ada kelas - Data NOL v0.3, silakan buat kelas baru' : 'Data kelas nyata - bisa diganti via PUT /api/kelas/:id'
  });
});

// POST buat kelas baru - DATA NYATA
router.post('/', async (req, res) => {
  try {
    const parsed = kelasSchema.parse(req.body);
    const data = db.get();

    const kodeUndangan = parsed.kodeUndangan || generateKodeUndangan(parsed.nama);

    if (data.kelas.some(k => k.kodeUndangan === kodeUndangan)) {
      return res.status(400).json({ success: false, message: `Kode undangan ${kodeUndangan} sudah ada` });
    }

    const kelasId = uuidv4();
    const newKelas = {
      id: kelasId,
      nama: parsed.nama,
      tahunAjaran: parsed.tahunAjaran,
      semester: parsed.semester,
      kodeUndangan,
      waliKelasId: undefined as any,
      totalSiswa: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let newGuru = null;
    if (parsed.waliKelasNama && parsed.waliKelasNip) {
      const guruId = uuidv4();
      const passwordHash = await bcrypt.hash('guru123', 10);
      newGuru = {
        id: guruId,
        nip: parsed.waliKelasNip,
        nama: parsed.waliKelasNama,
        email: '',
        passwordHash,
        role: 'WALI_KELAS' as const,
        kelasDiampu: [kelasId],
        createdAt: new Date().toISOString()
      };
      newKelas.waliKelasId = guruId;
    }

    db.update(d => ({
      ...d,
      kelas: [...d.kelas, newKelas],
      guru: newGuru ? [...d.guru, newGuru] : d.guru
    }));

    try {
      const io = getIO();
      io.emit('kelas:baru', { kelas: newKelas, message: `Kelas baru ${newKelas.nama} dibuat` });
    } catch {}

    res.status(201).json({
      success: true,
      message: `Kelas nyata ${newKelas.nama} berhasil dibuat - v0.3 Kelas Bisa Diganti`,
      data: { kelas: newKelas, waliKelas: newGuru }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal buat kelas' });
  }
});

// GET kelas by id
router.get('/:id', (req, res) => {
  const data = db.get();
  const kelas = data.kelas.find(k => k.id === req.params.id);
  if (!kelas) return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
  
  const siswa = data.siswa.filter(s => s.kelasId === kelas.id);
  const sesiHariIni = data.sesiAbsen.filter(s => s.kelasId === kelas.id);
  
  res.json({
    success: true,
    data: {
      ...kelas,
      totalSiswaReal: siswa.length,
      siswa,
      sesiHariIni,
      waliKelas: data.guru.find(g => g.id === kelas.waliKelasId)
    }
  });
});

// PUT edit kelas - FIX CACAT v0.3 - KELAS BISA DIGANTI
router.put('/:id', async (req, res) => {
  try {
    const parsed = kelasUpdateSchema.parse(req.body);
    const data = db.get();
    
    const kelas = data.kelas.find(k => k.id === req.params.id);
    if (!kelas) return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });

    // Cek kode undangan duplikat jika diganti
    if (parsed.kodeUndangan && parsed.kodeUndangan !== kelas.kodeUndangan) {
      if (data.kelas.some(k => k.kodeUndangan === parsed.kodeUndangan && k.id !== req.params.id)) {
        return res.status(400).json({ success: false, message: `Kode undangan ${parsed.kodeUndangan} sudah dipakai kelas lain` });
      }
    }

    // Cek wali kelas exists jika diganti
    if (parsed.waliKelasId) {
      const guru = data.guru.find(g => g.id === parsed.waliKelasId);
      if (!guru) return res.status(404).json({ success: false, message: 'Guru wali kelas tidak ditemukan' });
    }

    const updatedKelas = {
      ...kelas,
      nama: parsed.nama || kelas.nama,
      tahunAjaran: parsed.tahunAjaran || kelas.tahunAjaran,
      semester: parsed.semester || kelas.semester,
      kodeUndangan: parsed.kodeUndangan || kelas.kodeUndangan,
      waliKelasId: parsed.waliKelasId === null ? undefined : parsed.waliKelasId !== undefined ? parsed.waliKelasId : kelas.waliKelasId,
      updatedAt: new Date().toISOString()
    };

    db.update(d => ({
      ...d,
      kelas: d.kelas.map(k => k.id === req.params.id ? updatedKelas : k)
    }));

    // Update guru kelasDiampu jika wali diganti
    if (parsed.waliKelasId) {
      db.update(d => ({
        ...d,
        guru: d.guru.map(g => {
          // Hapus kelas ini dari wali lama
          if (g.id === kelas.waliKelasId && g.id !== parsed.waliKelasId) {
            return { ...g, kelasDiampu: g.kelasDiampu?.filter(id => id !== kelas.id) };
          }
          // Tambah ke wali baru
          if (g.id === parsed.waliKelasId) {
            const already = g.kelasDiampu?.includes(kelas.id);
            return { ...g, kelasDiampu: already ? g.kelasDiampu : [...(g.kelasDiampu||[]), kelas.id] };
          }
          return g;
        })
      }));
    }

    try {
      const io = getIO();
      io.to(`kelas:${kelas.id}`).emit('kelas:update', { kelas: updatedKelas, message: `Kelas ${kelas.nama} diganti jadi ${updatedKelas.nama}` });
      io.emit('kelas:list-update', { message: 'List kelas update - kelas bisa diganti v0.3' });
    } catch {}

    res.json({
      success: true,
      message: `Kelas berhasil diganti - Fix cacat v0.3 - ${kelas.nama} → ${updatedKelas.nama}`,
      data: {
        before: kelas,
        after: updatedKelas,
        changed: Object.keys(parsed),
        realtime: true
      }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal ganti kelas' });
  }
});

// DELETE kelas
router.delete('/:id', (req, res) => {
  const data = db.get();
  const kelas = data.kelas.find(k => k.id === req.params.id);
  if (!kelas) return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });

  const siswaCount = data.siswa.filter(s => s.kelasId === kelas.id).length;
  if (siswaCount > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tidak bisa hapus kelas ${kelas.nama}, masih ada ${siswaCount} siswa real. Pindahkan dulu siswa via PUT /api/siswa/:id`,
      solution: 'Gunakan endpoint pindah kelas dulu'
    });
  }

  db.update(d => ({
    ...d,
    kelas: d.kelas.filter(k => k.id !== req.params.id),
    guru: d.guru.map(g => ({
      ...g,
      kelasDiampu: g.kelasDiampu?.filter(id => id !== req.params.id)
    }))
  }));

  try {
    const io = getIO();
    io.emit('kelas:hapus', { kelasId: kelas.id, nama: kelas.nama });
  } catch {}

  res.json({ success: true, message: `Kelas ${kelas.nama} dihapus - v0.3` });
});

export default router;
