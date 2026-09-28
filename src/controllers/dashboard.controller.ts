import { Request, Response } from 'express';
import { db } from '../config/db';
import dayjs from 'dayjs';

export const getDashboardSiswa = async (req: any, res: Response) => {
  try {
    const siswaId = req.user.id;
    const data = db.get();

    const siswa = data.siswa.find(s => s.id === siswaId);
    if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

    const kelas = data.kelas.find(k => k.id === siswa.kelasId);
    const today = dayjs().format('YYYY-MM-DD');
    const bulanIni = dayjs().format('YYYY-MM');

    const statusHariIni = data.absensi.find(a => a.siswaId === siswaId && a.tanggal === today) || null;

    const absensiBulanIni = data.absensi.filter(a => a.siswaId === siswaId && a.tanggal.startsWith(bulanIni));

    const rekapBulan = {
      hadir: absensiBulanIni.filter(a => a.status === 'HADIR').length,
      terlambat: absensiBulanIni.filter(a => a.status === 'TERLAMBAT').length,
      izin: absensiBulanIni.filter(a => a.status === 'IZIN' || a.status === 'DISPENSASI').length,
      sakit: absensiBulanIni.filter(a => a.status === 'SAKIT').length,
      alpha: absensiBulanIni.filter(a => a.status === 'ALPHA').length,
      persentase: 0
    };

    const totalHari = rekapBulan.hadir + rekapBulan.terlambat + rekapBulan.izin + rekapBulan.sakit + rekapBulan.alpha;
    rekapBulan.persentase = totalHari > 0 ? Math.round(((rekapBulan.hadir + rekapBulan.terlambat) / totalHari) * 100 * 10) / 10 : 0;

    const riwayat = data.absensi
      .filter(a => a.siswaId === siswaId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        profil: siswa,
        kelas,
        statusHariIni,
        rekapBulan,
        riwayat,
        notifikasiOrtu: true,
        jamServer: dayjs().format('HH:mm:ss WIB - DD MMM YYYY')
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal ambil dashboard siswa' });
  }
};

export const getDashboardGuru = async (req: any, res: Response) => {
  try {
    const guruId = req.user.id;
    const data = db.get();

    const guru = data.guru.find(g => g.id === guruId);
    if (!guru) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });

    const kelasId = guru.kelasDiampu?.[0] || data.kelas[0]?.id;
    const kelas = data.kelas.find(k => k.id === kelasId) || null;
    // FIX v1.0.35: Jika belum ada kelas, jangan 404, return NOL biar dashboard tidak error dan tidak tampil SMK N 1 BANDUNG lama
    if (!kelas) {
      return res.json({
        success: true,
        isEmpty: true,
        message: 'Belum ada kelas - Data NOL - Silakan buat kelas di /setup.html',
        data: {
          guru: { nama: guru.nama, nip: guru.nip, role: guru.role },
          kelas: null,
          kelasList: [],
          settings: data.settings || null,
          sesiAktif: null,
          stats: { totalSiswa: 0, hadirHariIni: 0, terlambatHariIni: 0, izinHariIni: 0, alphaHariIni: 0 },
          metrik: { total: 0, hadir: 0, tepatWaktu: 0, terlambat: 0, izinSakit: 0, alpha: 0, persentase: 0 },
          pendingIzin: [],
          pantauanKhusus: [],
          jamServer: new Date().toISOString()
        }
      });
    }

    const today = dayjs().format('YYYY-MM-DD');
    const sesiAktif = data.sesiAbsen
      .filter(s => s.kelasId === kelasId && s.tanggal === today)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

    const siswaKelas = data.siswa.filter(s => s.kelasId === kelasId);
    const absensiHariIni = data.absensi.filter(a => a.tanggal === today && siswaKelas.some(s => s.id === a.siswaId));

    const metrik = {
      total: siswaKelas.length,
      hadir: absensiHariIni.filter(a => a.status === 'HADIR' || a.status === 'TERLAMBAT').length,
      tepatWaktu: absensiHariIni.filter(a => a.status === 'HADIR').length,
      terlambat: absensiHariIni.filter(a => a.status === 'TERLAMBAT').length,
      izinSakit: absensiHariIni.filter(a => ['SAKIT', 'IZIN', 'DISPENSASI'].includes(a.status)).length,
      alpha: siswaKelas.length - absensiHariIni.length, // belum absen dianggap alpha sementara
      persentase: 0
    };
    metrik.persentase = metrik.total > 0 ? Math.round((metrik.hadir / metrik.total) * 1000) / 10 : 0;

    const pendingIzin = data.izin
      .filter(i => i.status === 'PENDING' && siswaKelas.some(s => s.id === i.siswaId))
      .map(i => ({
        ...i,
        siswa: data.siswa.find(s => s.id === i.siswaId)!
      }))
      .slice(0, 5);

    const pantauanKhusus = siswaKelas.map(s => {
      const absen = absensiHariIni.find(a => a.siswaId === s.id);
      return {
        ...s,
        absensiHariIni: absen || null,
        statusHariIni: absen ? absen.status : 'ALPHA'
      };
    }).filter(s => !s.absensiHariIni || s.absensiHariIni.status === 'TERLAMBAT' || s.statusHariIni === 'ALPHA')
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        guru: { nama: guru.nama, nip: guru.nip },
        kelas,
        sesiAktif,
        metrik,
        pendingIzin,
        pantauanKhusus,
        jamServer: dayjs().format('HH:mm:ss WIB')
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal ambil dashboard guru' });
  }
};

export const getDaftarSiswa = async (req: any, res: Response) => {
  try {
    const data = db.get();
    const guru = data.guru.find(g => g.id === req.user.id);
    const kelasIds = guru?.kelasDiampu || data.kelas.map(k => k.id);

    const siswaList = data.siswa
      .filter(s => kelasIds.includes(s.kelasId))
      .map(s => {
        const kelas = data.kelas.find(k => k.id === s.kelasId);
        const absensiBulan = data.absensi.filter(a => a.siswaId === s.id && a.tanggal.startsWith(dayjs().format('YYYY-MM')));
        const presensiPersen = absensiBulan.length > 0 ? Math.round(((absensiBulan.filter(a => ['HADIR','TERLAMBAT'].includes(a.status)).length / absensiBulan.length) * 100)) : 100;

        return {
          ...s,
          kelas: kelas?.nama,
          presensi: {
            persen: presensiPersen,
            hadir: absensiBulan.filter(a => a.status === 'HADIR').length,
            terlambat: absensiBulan.filter(a => a.status === 'TERLAMBAT').length,
            sakit: absensiBulan.filter(a => a.status === 'SAKIT').length,
            izin: absensiBulan.filter(a => a.status === 'IZIN').length,
            alpha: absensiBulan.filter(a => a.status === 'ALPHA').length
          }
        };
      })
      .sort((a,b) => a.noAbsen - b.noAbsen);

    res.json({ success: true, data: siswaList, total: siswaList.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal ambil daftar siswa' });
  }
};
