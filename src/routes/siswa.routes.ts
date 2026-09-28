import { Router } from 'express';
import { db } from '../config/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getIO } from '../config/socket';

const router = Router();

const siswaRealSchema = z.object({
  nisn: z.string().min(5),
  noAbsen: z.number().int().min(1),
  nama: z.string().min(3),
  kelasId: z.string().min(1),
  pin: z.string().min(4).optional(),
  ortuWhatsapp: z.string().optional(),
  kodeUndangan: z.string().optional(),
});

const siswaUpdateSchema = z.object({
  nisn: z.string().min(5).optional(),
  noAbsen: z.number().int().min(1).optional(),
  nama: z.string().min(3).optional(),
  kelasId: z.string().min(1).optional(), // FIX CACAT v0.3 - KELAS BISA DIGANTI
  pin: z.string().min(4).optional(),
  ortuWhatsapp: z.string().optional(),
  poinSikap: z.number().min(0).max(100).optional(),
});

const pindahKelasSchema = z.object({
  kelasIdBaru: z.string().min(1),
  alasan: z.string().min(5).optional(),
});

// GET semua siswa real
router.get('/', (req, res) => {
  const data = db.get();
  const { kelasId } = req.query;
  let siswaList = data.siswa;
  if (kelasId) siswaList = siswaList.filter(s => s.kelasId === kelasId);

  res.json({
    success: true,
    version: '0.3.0 - Kelas Bisa Diganti',
    data: siswaList.map(s => {
      const kelas = data.kelas.find(k => k.id === s.kelasId);
      return { ...s, kelasNama: kelas?.nama, passwordHash: undefined };
    }),
    total: siswaList.length,
    message: siswaList.length === 0 ? 'Belum ada siswa - Data NOL v0.3' : `${siswaList.length} siswa real - kelas bisa diganti via PUT /api/siswa/:id`
  });
});

// POST tambah siswa baru
router.post('/', async (req, res) => {
  try {
    const parsed = siswaRealSchema.parse(req.body);
    const data = db.get();
    const kelas = data.kelas.find(k => k.id === parsed.kelasId);
    if (!kelas) return res.status(404).json({ success: false, message: `Kelas ID ${parsed.kelasId} tidak ditemukan` });
    if (data.siswa.some(s => s.nisn === parsed.nisn)) return res.status(400).json({ success: false, message: `NISN ${parsed.nisn} sudah terdaftar` });
    if (data.siswa.some(s => s.kelasId === parsed.kelasId && s.noAbsen === parsed.noAbsen)) return res.status(400).json({ success: false, message: `No absen ${parsed.noAbsen} sudah ada di kelas ${kelas.nama}` });

    const avatarInitial = parsed.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const pin = parsed.pin || Math.random().toString().substring(2, 8);
    const passwordHash = await bcrypt.hash(pin, 10);

    const newSiswa = {
      id: uuidv4(),
      nisn: parsed.nisn,
      noAbsen: parsed.noAbsen,
      nama: parsed.nama,
      kelasId: parsed.kelasId,
      pin,
      passwordHash,
      deviceId: undefined,
      avatarInitial,
      ortuWhatsapp: parsed.ortuWhatsapp || '',
      poinSikap: 100,
      predikat: 'A' as const,
      kodeUndangan: parsed.kodeUndangan || kelas.kodeUndangan,
      createdAt: new Date().toISOString(),
      riwayatKelas: [{ kelasId: parsed.kelasId, kelasNama: kelas.nama, tanggal: new Date().toISOString(), alasan: 'Daftar awal' }]
    };

    db.update(d => ({
      ...d,
      siswa: [...d.siswa, newSiswa],
      kelas: d.kelas.map(k => k.id === kelas.id ? { ...k, totalSiswa: d.siswa.filter(s => s.kelasId === k.id).length + 1 } : k)
    }));

    try {
      const io = getIO();
      io.to(`kelas:${kelas.id}`).emit('siswa:baru', { siswa: newSiswa, message: `Siswa baru ${newSiswa.nama} masuk kelas ${kelas.nama}` });
    } catch {}

    res.status(201).json({
      success: true,
      message: `Siswa real ${newSiswa.nama} berhasil ditambahkan - Kelas bisa diganti v0.3`,
      data: { siswa: { ...newSiswa, passwordHash: undefined }, kelas: kelas.nama }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal tambah siswa' });
  }
});

// GET siswa by id
router.get('/:id', (req, res) => {
  const data = db.get();
  const siswa = data.siswa.find(s => s.id === req.params.id);
  if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
  const kelas = data.kelas.find(k => k.id === siswa.kelasId);
  const absensi = data.absensi.filter(a => a.siswaId === siswa.id);
  res.json({
    success: true,
    data: {
      ...siswa,
      passwordHash: undefined,
      kelas,
      totalAbsensi: absensi.length,
      riwayatKelas: (siswa as any).riwayatKelas || []
    }
  });
});

// PUT update siswa - FIX CACAT v0.3 - KELAS BISA DIGANTI
router.put('/:id', async (req, res) => {
  try {
    const parsed = siswaUpdateSchema.parse(req.body);
    const data = db.get();
    const siswa = data.siswa.find(s => s.id === req.params.id);
    if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

    // Jika ganti kelas, validasi
    let kelasLama = data.kelas.find(k => k.id === siswa.kelasId);
    let kelasBaru = null;
    if (parsed.kelasId && parsed.kelasId !== siswa.kelasId) {
      kelasBaru = data.kelas.find(k => k.id === parsed.kelasId);
      if (!kelasBaru) return res.status(404).json({ success: false, message: `Kelas baru ID ${parsed.kelasId} tidak ditemukan` });
      
      // Cek no absen duplikat di kelas baru
      if (parsed.noAbsen || true) {
        const noAbsenToCheck = parsed.noAbsen || siswa.noAbsen;
        if (data.siswa.some(s => s.kelasId === parsed.kelasId && s.noAbsen === noAbsenToCheck && s.id !== siswa.id)) {
          return res.status(400).json({ success: false, message: `No absen ${noAbsenToCheck} sudah ada di kelas ${kelasBaru.nama}` });
        }
      }
    }

    let passwordHash = siswa.passwordHash;
    let newPin = siswa.pin;
    if (parsed.pin) {
      newPin = parsed.pin;
      passwordHash = await bcrypt.hash(parsed.pin, 10);
    }

    const updatedSiswa = {
      ...siswa,
      nisn: parsed.nisn || siswa.nisn,
      noAbsen: parsed.noAbsen || siswa.noAbsen,
      nama: parsed.nama || siswa.nama,
      kelasId: parsed.kelasId || siswa.kelasId,
      pin: newPin,
      passwordHash,
      ortuWhatsapp: parsed.ortuWhatsapp !== undefined ? parsed.ortuWhatsapp : siswa.ortuWhatsapp,
      poinSikap: parsed.poinSikap !== undefined ? parsed.poinSikap : siswa.poinSikap,
      avatarInitial: (parsed.nama || siswa.nama).split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      kodeUndangan: parsed.kelasId ? (kelasBaru?.kodeUndangan || siswa.kodeUndangan) : siswa.kodeUndangan,
      updatedAt: new Date().toISOString(),
      riwayatKelas: parsed.kelasId && parsed.kelasId !== siswa.kelasId 
        ? [...((siswa as any).riwayatKelas||[]), { kelasId: parsed.kelasId, kelasNama: kelasBaru?.nama, tanggal: new Date().toISOString(), alasan: 'Pindah kelas via edit' }]
        : (siswa as any).riwayatKelas
    };

    db.update(d => {
      let newData = {
        ...d,
        siswa: d.siswa.map(s => s.id === req.params.id ? updatedSiswa : s)
      };
      // Update totalSiswa count jika pindah kelas
      if (parsed.kelasId && parsed.kelasId !== siswa.kelasId) {
        newData.kelas = d.kelas.map(k => {
          if (k.id === siswa.kelasId) return { ...k, totalSiswa: Math.max(0, d.siswa.filter(s => s.kelasId === k.id).length - 1) };
          if (k.id === parsed.kelasId) return { ...k, totalSiswa: d.siswa.filter(s => s.kelasId === k.id).length + 1 };
          return k;
        });
      }
      return newData;
    });

    try {
      const io = getIO();
      if (parsed.kelasId && parsed.kelasId !== siswa.kelasId) {
        io.to(`kelas:${siswa.kelasId}`).emit('siswa:pindah-keluar', { siswa: updatedSiswa, kelasLama: kelasLama?.nama, kelasBaru: kelasBaru?.nama });
        io.to(`kelas:${parsed.kelasId}`).emit('siswa:pindah-masuk', { siswa: updatedSiswa, kelasLama: kelasLama?.nama, kelasBaru: kelasBaru?.nama });
        io.emit('siswa:update', { siswa: updatedSiswa, type: 'PINDAH_KELAS' });
      } else {
        io.to(`kelas:${siswa.kelasId}`).emit('siswa:update', { siswa: updatedSiswa, type: 'UPDATE_DATA' });
      }
    } catch {}

    res.json({
      success: true,
      message: parsed.kelasId && parsed.kelasId !== siswa.kelasId 
        ? `Siswa ${siswa.nama} berhasil pindah kelas: ${kelasLama?.nama} → ${kelasBaru?.nama} - Fix cacat v0.3`
        : `Siswa ${siswa.nama} diupdate - v0.3`,
      data: {
        before: { nama: siswa.nama, kelasId: siswa.kelasId, kelasNama: kelasLama?.nama },
        after: { nama: updatedSiswa.nama, kelasId: updatedSiswa.kelasId, kelasNama: kelasBaru?.nama || kelasLama?.nama },
        changed: Object.keys(parsed),
        realtime: true
      }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal update siswa' });
  }
});

// POST pindah kelas khusus dengan alasan - v0.3
router.post('/:id/pindah-kelas', async (req, res) => {
  try {
    const parsed = pindahKelasSchema.parse(req.body);
    const data = db.get();
    const siswa = data.siswa.find(s => s.id === req.params.id);
    if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

    const kelasLama = data.kelas.find(k => k.id === siswa.kelasId);
    const kelasBaru = data.kelas.find(k => k.id === parsed.kelasIdBaru);
    if (!kelasBaru) return res.status(404).json({ success: false, message: 'Kelas baru tidak ditemukan' });
    if (siswa.kelasId === parsed.kelasIdBaru) return res.status(400).json({ success: false, message: 'Siswa sudah di kelas tersebut' });

    // Cek no absen duplikat
    if (data.siswa.some(s => s.kelasId === parsed.kelasIdBaru && s.noAbsen === siswa.noAbsen)) {
      return res.status(400).json({ 
        success: false, 
        message: `No absen ${siswa.noAbsen} sudah ada di kelas ${kelasBaru.nama}. Ganti no absen dulu.`,
        solution: `PUT /api/siswa/${siswa.id} dengan noAbsen baru`
      });
    }

    const updatedSiswa = {
      ...siswa,
      kelasId: parsed.kelasIdBaru,
      kodeUndangan: kelasBaru.kodeUndangan,
      updatedAt: new Date().toISOString(),
      riwayatKelas: [...((siswa as any).riwayatKelas||[]), { 
        kelasId: parsed.kelasIdBaru, 
        kelasNama: kelasBaru.nama, 
        tanggal: new Date().toISOString(), 
        alasan: parsed.alasan || 'Pindah kelas',
        dari: kelasLama?.nama
      }]
    };

    db.update(d => ({
      ...d,
      siswa: d.siswa.map(s => s.id === req.params.id ? updatedSiswa : s),
      kelas: d.kelas.map(k => {
        if (k.id === siswa.kelasId) return { ...k, totalSiswa: Math.max(0, d.siswa.filter(s => s.kelasId === k.id).length - 1) };
        if (k.id === parsed.kelasIdBaru) return { ...k, totalSiswa: d.siswa.filter(s => s.kelasId === k.id).length + 1 };
        return k;
      })
    }));

    try {
      const io = getIO();
      io.to(`kelas:${siswa.kelasId}`).emit('siswa:pindah-keluar', { siswa: updatedSiswa, kelasLama: kelasLama?.nama, kelasBaru: kelasBaru.nama, alasan: parsed.alasan });
      io.to(`kelas:${parsed.kelasIdBaru}`).emit('siswa:pindah-masuk', { siswa: updatedSiswa, kelasLama: kelasLama?.nama, kelasBaru: kelasBaru.nama, alasan: parsed.alasan });
      io.emit('siswa:pindah-kelas', { siswa: updatedSiswa, dari: kelasLama?.nama, ke: kelasBaru.nama });
    } catch {}

    res.json({
      success: true,
      message: `Siswa ${siswa.nama} pindah kelas berhasil: ${kelasLama?.nama} → ${kelasBaru.nama}`,
      data: {
        siswa: { id: updatedSiswa.id, nama: updatedSiswa.nama, nisn: updatedSiswa.nisn },
        dari: { id: kelasLama?.id, nama: kelasLama?.nama },
        ke: { id: kelasBaru.id, nama: kelasBaru.nama, kodeUndangan: kelasBaru.kodeUndangan },
        alasan: parsed.alasan,
        realtime: true
      }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal pindah kelas' });
  }
});

router.delete('/:id', (req, res) => {
  const data = db.get();
  const siswa = data.siswa.find(s => s.id === req.params.id);
  if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
  db.update(d => ({
    ...d,
    siswa: d.siswa.filter(s => s.id !== req.params.id),
    absensi: d.absensi.filter(a => a.siswaId !== req.params.id),
    izin: d.izin.filter(i => i.siswaId !== req.params.id),
    kelas: d.kelas.map(k => k.id === siswa.kelasId ? { ...k, totalSiswa: Math.max(0, d.siswa.filter(s => s.kelasId === k.id).length - 1) } : k)
  }));
  try {
    const io = getIO();
    io.to(`kelas:${siswa.kelasId}`).emit('siswa:hapus', { siswaId: siswa.id, nama: siswa.nama });
  } catch {}
  res.json({ success: true, message: `Siswa real ${siswa.nama} dihapus` });
});

router.post('/bulk', async (req, res) => {
  try {
    const { kelasId, siswaList } = req.body;
    if (!kelasId || !Array.isArray(siswaList)) return res.status(400).json({ success: false, message: 'kelasId dan siswaList array wajib' });
    const data = db.get();
    const kelas = data.kelas.find(k => k.id === kelasId);
    if (!kelas) return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
    const newBatch: any[] = [];
    const errors: any[] = [];
    for (const s of siswaList) {
      if (!s.nisn || !s.nama || !s.noAbsen) { errors.push({ data: s, error: 'nisn, nama, noAbsen wajib' }); continue; }
      if (data.siswa.some(e => e.nisn === s.nisn) || newBatch.some((ns: any) => ns.nisn === s.nisn)) { errors.push({ data: s, error: `NISN ${s.nisn} duplikat` }); continue; }
      const pin = s.pin || Math.random().toString().substring(2, 8);
      const passwordHash = await bcrypt.hash(pin, 10);
      newBatch.push({
        id: uuidv4(),
        nisn: s.nisn,
        noAbsen: s.noAbsen,
        nama: s.nama,
        kelasId,
        pin,
        passwordHash,
        avatarInitial: s.nama.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
        ortuWhatsapp: s.ortuWhatsapp || '',
        poinSikap: 100,
        predikat: 'A' as const,
        kodeUndangan: kelas.kodeUndangan,
        createdAt: new Date().toISOString(),
        riwayatKelas: [{ kelasId, kelasNama: kelas.nama, tanggal: new Date().toISOString(), alasan: 'Bulk import' }]
      });
    }
    db.update(d => ({
      ...d,
      siswa: [...d.siswa, ...newBatch],
      kelas: d.kelas.map(k => k.id === kelasId ? { ...k, totalSiswa: d.siswa.filter(s => s.kelasId === kelasId).length + newBatch.length } : k)
    }));
    try {
      const io = getIO();
      io.to(`kelas:${kelasId}`).emit('siswa:bulk', { count: newBatch.length, kelas: kelas.nama });
    } catch {}
    res.json({ success: true, message: `Bulk import ${newBatch.length} siswa real`, data: { added: newBatch.length, failed: errors.length, errors } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal bulk import' });
  }
});

export default router;
