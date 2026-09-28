import { Request, Response } from 'express';
import { db } from '../config/db';
import { env } from '../config/env';
import { isWithinGeofence, getJamStatus } from '../utils/geofence';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { z } from 'zod';
import { emitAbsensiBaru } from '../config/socket';

const scanSchema = z.object({
  qrToken: z.string().min(5),
  lat: z.number(),
  lng: z.number(),
  faceVerified: z.boolean().optional().default(false),
  deviceId: z.string().optional()
});

export const scanAbsen = async (req: any, res: Response) => {
  try {
    const { qrToken, lat, lng, faceVerified, deviceId } = scanSchema.parse(req.body);
    const siswaId = req.user.id;
    const data = db.get();

    const siswa = data.siswa.find(s => s.id === siswaId);
    if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

    // Anti titip absen: cek device
    if (siswa.deviceId && deviceId && siswa.deviceId !== deviceId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Perangkat tidak sesuai. 1 Perangkat untuk 1 Siswa (Anti Titip Absen).',
        code: 'DEVICE_MISMATCH'
      });
    }

    // Cari sesi by QR token
    const sesi = data.sesiAbsen.find(s => s.qrCode === qrToken);
    if (!sesi) {
      return res.status(404).json({ success: false, message: 'QR Code tidak valid atau sesi tidak ditemukan.' });
    }

    if (sesi.isLocked) {
      return res.status(403).json({ success: false, message: 'Sesi absen sudah dikunci oleh Wali Kelas.' });
    }

    // Cek expiry QR
    if (dayjs().isAfter(dayjs(sesi.qrExpiresAt))) {
      return res.status(400).json({ success: false, message: 'QR Code expired. Minta Guru refresh QR.', code: 'QR_EXPIRED' });
    }

    // Cek geofence - FIX v0.5.4: pakai settings dinamis jika ada (Bandung/Surabaya), bukan hardcode Jakarta
    const schoolLat = data.settings?.lat || env.SCHOOL_LAT;
    const schoolLng = data.settings?.lng || env.SCHOOL_LNG;
    const schoolRadius = data.settings?.radiusMeter || env.GEOFENCE_RADIUS;
    const geo = isWithinGeofence(lat, lng, schoolLat, schoolLng, schoolRadius);
    if (!geo.inside) {
      return res.status(403).json({ 
        success: false, 
        message: `Lokasi di luar radius sekolah. Jarak kamu ${geo.distance}m, maksimal ${schoolRadius}m. Sekolah di ${data.settings?.sekolahNama || env.SCHOOL_NAME} (${schoolLat},${schoolLng})`,
        data: { jarak: geo.distance, radius: schoolRadius, inside: false, sekolah: data.settings?.sekolahNama, lat: schoolLat, lng: schoolLng }
      });
    }

    // Cek sudah absen hari ini belum
    const today = dayjs().format('YYYY-MM-DD');
    const sudahAbsen = data.absensi.find(a => a.siswaId === siswaId && a.tanggal === today);
    if (sudahAbsen) {
      return res.status(400).json({ success: false, message: `Kamu sudah absen hari ini jam ${sudahAbsen.jamCheckin} - Status: ${sudahAbsen.status}`, data: sudahAbsen });
    }

    // Hitung status hadir / terlambat
    const now = dayjs();
    const jamNow = now.format('HH:mm:ss');
    const { status, terlambatMenit } = getJamStatus(jamNow, sesi.batasToleransi);

    const absensiBaru = {
      id: uuidv4(),
      siswaId,
      sesiId: sesi.id,
      tanggal: today,
      jamCheckin: jamNow,
      jamCheckinFull: now.toISOString(),
      status: status as any,
      keterlambatanMenit: terlambatMenit,
      lokasi: {
        lat,
        lng,
        nama: 'Gerbang Utara Presensi',
        jarakMeter: geo.distance,
        isWithinGeofence: true
      },
      faceVerified: faceVerified || false,
      deviceId,
      createdAt: now.toISOString()
    };

    db.update(d => ({
      ...d,
      absensi: [...d.absensi, absensiBaru]
    }));

    // Real-time emit v0.2
    emitAbsensiBaru(siswa.kelasId, absensiBaru, siswa);

    // Simulasi kirim WA Ortu - real akan pakai API
    console.log(`📱 WA Ortu Terkirim: ${siswa.nama} ${status} jam ${jamNow} - Jarak ${geo.distance}m - Real GPS: ${lat},${lng}`);

    res.json({
      success: true,
      message: status === 'HADIR' ? 'Absen berhasil! Kamu tepat waktu.' : `Absen berhasil! Terlambat ${terlambatMenit} menit. Poin -2`,
      data: {
        absensi: absensiBaru,
        siswa: { nama: siswa.nama, nisn: siswa.nisn, kelasId: siswa.kelasId },
        notifikasi: { waOrtu: 'Terkirim ✓✓', telegramWali: 'Terkirim' }
      }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal absen' });
  }
};

export const getMyAbsensi = async (req: any, res: Response) => {
  try {
    const siswaId = req.user.id;
    const data = db.get();
    const list = data.absensi.filter(a => a.siswaId === siswaId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal ambil absensi' });
  }
};

export const inputManual = async (req: any, res: Response) => {
  try {
    const { siswaId, status, tanggal, jamCheckin, keterangan } = req.body;
    const data = db.get();

    const siswa = data.siswa.find(s => s.id === siswaId);
    if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

    const today = tanggal || dayjs().format('YYYY-MM-DD');
    let sesi = data.sesiAbsen.find(s => s.kelasId === siswa.kelasId && s.tanggal === today);
    
    if (!sesi) {
      sesi = {
        id: uuidv4(),
        kelasId: siswa.kelasId,
        tanggal: today,
        jamMasuk: env.JAM_MASUK,
        batasToleransi: env.BATAS_TOLERANSI,
        qrCode: uuidv4(),
        qrPayload: '{}',
        qrExpiresAt: dayjs().add(1, 'day').toISOString(),
        isLocked: false,
        createdBy: req.user.id,
        createdAt: new Date().toISOString()
      };
      db.update(d => ({ ...d, sesiAbsen: [...d.sesiAbsen, sesi!] }));
    }

    const schoolLat2 = data.settings?.lat || env.SCHOOL_LAT;
    const schoolLng2 = data.settings?.lng || env.SCHOOL_LNG;
    const absensiBaru = {
      id: uuidv4(),
      siswaId,
      sesiId: sesi.id,
      tanggal: today,
      jamCheckin: jamCheckin || dayjs().format('HH:mm:ss'),
      jamCheckinFull: dayjs().toISOString(),
      status: status || 'HADIR',
      keterlambatanMenit: 0,
      lokasi: {
        lat: schoolLat2,
        lng: schoolLng2,
        nama: 'Input Manual Wali Kelas',
        jarakMeter: 0,
        isWithinGeofence: true
      },
      faceVerified: false,
      createdAt: new Date().toISOString()
    };

    db.update(d => ({
      ...d,
      absensi: [...d.absensi, absensiBaru]
    }));

    res.json({ success: true, message: `Absen manual untuk ${siswa.nama} berhasil dicatat: ${status}`, data: absensiBaru });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal input manual' });
  }
};
