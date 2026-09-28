import { Router } from 'express';
import { db } from '../config/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getIO } from '../config/socket';
import { authenticate } from '../middlewares/auth';

const router = Router();

// GET my profile - real data
router.get('/me', authenticate, (req: any, res) => {
  const data = db.get();
  const user = req.user;

  if (user.role === 'SISWA') {
    const siswa = data.siswa.find(s => s.id === user.id);
    if (!siswa) return res.status(404).json({ success: false, message: 'Profil siswa tidak ditemukan - data NOL v0.5' });
    const kelas = data.kelas.find(k => k.id === siswa.kelasId);
    const settings = data.settings;
    const absensi = data.absensi.filter(a => a.siswaId === siswa.id);
    const izin = data.izin.filter(i => i.siswaId === siswa.id);

    res.json({
      success: true,
      version: '0.5.0 - Profil Real',
      data: {
        id: siswa.id,
        nisn: siswa.nisn,
        noAbsen: siswa.noAbsen,
        nama: siswa.nama,
        kelas: kelas ? { id: kelas.id, nama: kelas.nama, kodeUndangan: kelas.kodeUndangan, tahunAjaran: kelas.tahunAjaran } : null,
        sekolah: settings ? { nama: settings.sekolahNama, alamat: settings.sekolahAlamat } : null,
        avatarInitial: siswa.avatarInitial,
        ortuWhatsapp: siswa.ortuWhatsapp,
        poinSikap: siswa.poinSikap,
        predikat: siswa.predikat,
        deviceId: siswa.deviceId ? 'Terdaftar - Anti Titip Absen Aktif' : 'Belum terdaftar',
        totalAbsensi: absensi.length,
        rekap: {
          hadir: absensi.filter(a => a.status === 'HADIR').length,
          terlambat: absensi.filter(a => a.status === 'TERLAMBAT').length,
          sakit: absensi.filter(a => a.status === 'SAKIT').length,
          izin: absensi.filter(a => ['IZIN','DISPENSASI'].includes(a.status)).length,
          alpha: absensi.filter(a => a.status === 'ALPHA').length
        },
        izin: izin.slice(0, 5),
        riwayatKelas: (siswa as any).riwayatKelas || []
      }
    });
  } else {
    const guru = data.guru.find(g => g.id === user.id);
    if (!guru) return res.status(404).json({ success: false, message: 'Profil guru tidak ditemukan' });
    const kelasDiampu = data.kelas.filter(k => guru.kelasDiampu?.includes(k.id));
    const settings = data.settings;

    res.json({
      success: true,
      version: '0.5.0 - Profil Guru Real',
      data: {
        id: guru.id,
        nip: guru.nip,
        nama: guru.nama,
        email: guru.email,
        role: guru.role,
        kelasDiampu,
        sekolah: settings,
        totalKelas: kelasDiampu.length,
        totalSiswa: data.siswa.filter(s => guru.kelasDiampu?.includes(s.kelasId)).length
      }
    });
  }
});

// PUT update my profile - siswa - SECURITY: siswa tidak bisa ganti peran jadi guru!
router.put('/me', authenticate, async (req: any, res) => {
  try {
    const data = db.get();
    const user = req.user;

    if (user.role !== 'SISWA') {
      return res.status(403).json({ success: false, message: 'Hanya siswa bisa update profil via endpoint ini' });
    }

    // SECURITY FIX: Cegah murid ganti peran jadi guru - masalah besar!
    // Tolak jika ada field berbahaya di body
    const forbiddenFields = ['role', 'nip', 'id', 'kelasId', 'nisn', 'noAbsen', 'poinSikap', 'predikat', 'deviceId', 'nik', 'nikVerified'];
    const attemptedForbidden = forbiddenFields.filter(f => req.body[f] !== undefined);
    if (attemptedForbidden.length > 0) {
      return res.status(403).json({ 
        success: false, 
        message: `Akses ditolak! Murid tidak boleh ganti ${attemptedForbidden.join(', ')} - Security violation!`,
        code: 'ROLE_ESCALATION_BLOCKED'
      });
    }

    const siswa = data.siswa.find(s => s.id === user.id);
    if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

    const { nama, ortuWhatsapp, pin } = req.body;

    let passwordHash = siswa.passwordHash;
    let newPin = siswa.pin;
    if (pin) {
      if (pin.length < 4) return res.status(400).json({ success: false, message: 'PIN minimal 4 digit' });
      newPin = pin;
      passwordHash = await bcrypt.hash(pin, 10);
    }

    const updated = {
      ...siswa,
      nama: nama || siswa.nama,
      ortuWhatsapp: ortuWhatsapp !== undefined ? ortuWhatsapp : siswa.ortuWhatsapp,
      pin: newPin,
      passwordHash,
      avatarInitial: (nama || siswa.nama).split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase(),
      updatedAt: new Date().toISOString()
    };

    db.update(d => ({
      ...d,
      siswa: d.siswa.map(s => s.id === user.id ? updated : s)
    }));

    try {
      const io = getIO();
      io.to(`siswa:${siswa.id}`).emit('profile:update', { siswa: updated, message: 'Profil berhasil diupdate v0.5' });
      io.to(`kelas:${siswa.kelasId}`).emit('siswa:update', { siswa: updated });
    } catch {}

    res.json({
      success: true,
      message: 'Profil berhasil diupdate - v0.5 Data Nyata',
      data: { ...updated, passwordHash: undefined }
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Gagal update profil' });
  }
});

// GET siswa profile by id - for guru
router.get('/siswa/:id', authenticate, (req, res) => {
  const data = db.get();
  const siswa = data.siswa.find(s => s.id === req.params.id);
  if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan - Data NOL v0.5, bukan data lama' });

  const kelas = data.kelas.find(k => k.id === siswa.kelasId);
  const absensi = data.absensi.filter(a => a.siswaId === siswa.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const izin = data.izin.filter(i => i.siswaId === siswa.id);

  res.json({
    success: true,
    version: '0.5.0 - Profil Murid Real - Fix Data Lama',
    data: {
      id: siswa.id,
      nisn: siswa.nisn,
      noAbsen: siswa.noAbsen,
      nama: siswa.nama,
      kelas: kelas ? { id: kelas.id, nama: kelas.nama, tahunAjaran: kelas.tahunAjaran, kodeUndangan: kelas.kodeUndangan } : null,
      avatarInitial: siswa.avatarInitial,
      ortuWhatsapp: siswa.ortuWhatsapp,
      poinSikap: siswa.poinSikap,
      predikat: siswa.predikat,
      deviceId: siswa.deviceId ? 'Terdaftar' : 'Belum',
      createdAt: siswa.createdAt,
      updatedAt: (siswa as any).updatedAt,
      riwayatKelas: (siswa as any).riwayatKelas || [],
      rekap: {
        total: absensi.length,
        hadir: absensi.filter(a => a.status === 'HADIR').length,
        terlambat: absensi.filter(a => a.status === 'TERLAMBAT').length,
        sakit: absensi.filter(a => a.status === 'SAKIT').length,
        izin: absensi.filter(a => ['IZIN','DISPENSASI'].includes(a.status)).length,
        alpha: absensi.filter(a => a.status === 'ALPHA').length,
        persentase: absensi.length ? Math.round((absensi.filter(a => ['HADIR','TERLAMBAT'].includes(a.status)).length / absensi.length)*100) : 0
      },
      absensi: absensi.slice(0, 20),
      izin: izin.slice(0, 10)
    }
  });
});

// GET all siswa with real-time search & filter - v0.5
router.get('/siswa', authenticate, (req, res) => {
  const data = db.get();
  const { kelasId, search, predikat, poinMin, poinMax } = req.query;

  let list = data.siswa;

  if (kelasId) list = list.filter(s => s.kelasId === kelasId);
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(s => s.nama.toLowerCase().includes(q) || s.nisn.includes(q));
  }
  if (predikat) list = list.filter(s => s.predikat === predikat);
  if (poinMin) list = list.filter(s => s.poinSikap >= parseInt(poinMin as string));
  if (poinMax) list = list.filter(s => s.poinSikap <= parseInt(poinMax as string));

  const result = list.map(s => {
    const kelas = data.kelas.find(k => k.id === s.kelasId);
    const absensi = data.absensi.filter(a => a.siswaId === s.id);
    return {
      id: s.id,
      nisn: s.nisn,
      noAbsen: s.noAbsen,
      nama: s.nama,
      kelas: kelas ? { id: kelas.id, nama: kelas.nama } : null,
      avatarInitial: s.avatarInitial,
      poinSikap: s.poinSikap,
      predikat: s.predikat,
      ortuWhatsapp: s.ortuWhatsapp,
      totalAbsensi: absensi.length,
      presensiPersen: absensi.length ? Math.round((absensi.filter(a => ['HADIR','TERLAMBAT'].includes(a.status)).length / absensi.length)*100) : 0,
      status: s.poinSikap === 100 ? 'Bintang' : s.poinSikap < 75 ? 'Perlu Pembinaan' : s.predikat
    };
  }).sort((a,b) => a.noAbsen - b.noAbsen);

  res.json({
    success: true,
    version: '0.5.1 - Fix Total Profil Lama Guru & Murid - Real Data 100%',
    data: result,
    total: result.length,
    filters: { kelasId, search, predikat, poinMin, poinMax },
    message: result.length === 0 ? 'Belum ada siswa real - Data NOL v0.5.1 - Database TRUE ZERO - Silakan tambah via POST /api/siswa atau /setup.html dengan data nyata' : `${result.length} siswa real - data nyata 100% - tahun 2026/2027`
  });
});

export default router;
