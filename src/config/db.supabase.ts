/**
 * Supabase DB Adapter - Drop-in replacement untuk JsonDB
 * Biar bisa pakai Supabase di Vercel tanpa ubah controllers banyak!
 * 
 * Jika SUPABASE_URL di-set, pakai Supabase. Jika tidak, fallback ke JSON.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { Database, Settings, defaultDB } from './db';
import fs from 'fs';
import path from 'path';

// JSON fallback (untuk development lokal tanpa Supabase)
const DB_PATH = path.join(__dirname, '../../data/database.json');

class SupabaseDB {
  // Cache untuk JSON fallback
  private jsonData: Database | null = null;

  private loadJson(): Database {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.settings && parsed.kelas !== undefined) {
          return { settings: null, ...parsed };
        }
        return parsed;
      }
    } catch {}
    return defaultDB;
  }

  private saveJson(data: Database) {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch {}
  }

  async get(): Promise<Database> {
    if (!isSupabaseConfigured()) {
      if (!this.jsonData) this.jsonData = this.loadJson();
      return this.jsonData;
    }

    try {
      // Fetch dari Supabase
      const [settingsRes, kelasRes, guruRes, siswaRes, sesiRes, absensiRes, izinRes] = await Promise.all([
        supabase.from('settings').select('*').limit(1).single(),
        supabase.from('kelas').select('*'),
        supabase.from('guru').select('*'),
        supabase.from('siswa').select('*'),
        supabase.from('sesi_absen').select('*'),
        supabase.from('absensi').select('*'),
        supabase.from('izin').select('*'),
      ]);

      const settings: Settings | null = settingsRes.data ? {
        id: settingsRes.data.id,
        sekolahNama: settingsRes.data.sekolah_nama,
        sekolahAlamat: settingsRes.data.sekolah_alamat,
        lat: settingsRes.data.lat,
        lng: settingsRes.data.lng,
        radiusMeter: settingsRes.data.radius_meter,
        tahunAjaran: settingsRes.data.tahun_ajaran,
        semester: settingsRes.data.semester as any,
        jamMasuk: settingsRes.data.jam_masuk,
        batasToleransi: settingsRes.data.batas_toleransi,
        updatedAt: settingsRes.data.updated_at,
        updatedBy: settingsRes.data.updated_by,
      } : null;

      const db: Database = {
        settings,
        kelas: (kelasRes.data || []).map((k: any) => ({
          id: k.id,
          nama: k.nama,
          tahunAjaran: k.tahun_ajaran,
          semester: k.semester,
          kodeUndangan: k.kode_undangan,
          waliKelasId: k.wali_kelas_id,
          totalSiswa: k.total_siswa,
          createdAt: k.created_at,
          updatedAt: k.updated_at,
        })),
        guru: (guruRes.data || []).map((g: any) => ({
          id: g.id,
          nip: g.nip,
          nama: g.nama,
          email: g.email,
          passwordHash: g.password_hash,
          role: g.role,
          kelasDiampu: g.kelas_diampu,
          avatarUrl: g.avatar_url,
          createdAt: g.created_at,
          nik: g.nik,
          nikVerified: g.nik_verified,
        })),
        siswa: (siswaRes.data || []).map((s: any) => ({
          id: s.id,
          nisn: s.nisn,
          noAbsen: s.no_absen,
          nama: s.nama,
          kelasId: s.kelas_id,
          pin: s.pin,
          passwordHash: s.password_hash,
          deviceId: s.device_id,
          avatarInitial: s.avatar_initial,
          ortuWhatsapp: s.ortu_whatsapp,
          poinSikap: s.poin_sikap,
          predikat: s.predikat,
          kodeUndangan: s.kode_undangan,
          createdAt: s.created_at,
          nik: s.nik,
          nikVerified: s.nik_verified,
          nikVerifiedAt: s.nik_verified_at,
          nikVerifiedBy: s.nik_verified_by,
          ktpFotoPath: s.ktp_foto_path,
        })),
        sesiAbsen: (sesiRes.data || []).map((s: any) => ({
          id: s.id,
          kelasId: s.kelas_id,
          tanggal: s.tanggal,
          jamMasuk: s.jam_masuk,
          batasToleransi: s.batas_toleransi,
          qrCode: s.qr_code,
          qrPayload: s.qr_payload,
          qrExpiresAt: s.qr_expires_at,
          isLocked: s.is_locked,
          createdBy: s.created_by,
          createdAt: s.created_at,
        })),
        absensi: (absensiRes.data || []).map((a: any) => ({
          id: a.id,
          siswaId: a.siswa_id,
          sesiId: a.sesi_id,
          tanggal: a.tanggal,
          jamCheckin: a.jam_checkin,
          jamCheckinFull: a.jam_checkin_full,
          status: a.status,
          keterlambatanMenit: a.keterlambatan_menit,
          lokasi: {
            lat: a.lokasi_lat,
            lng: a.lokasi_lng,
            nama: a.lokasi_nama,
            jarakMeter: a.jarak_meter,
            isWithinGeofence: a.is_within_geofence,
          },
          faceVerified: a.face_verified,
          deviceId: a.device_id,
          createdAt: a.created_at,
        })),
        izin: (izinRes.data || []).map((i: any) => ({
          id: i.id,
          siswaId: i.siswa_id,
          kategori: i.kategori,
          tglMulai: i.tgl_mulai,
          tglSelesai: i.tgl_selesai,
          durasiHari: i.durasi_hari,
          alasan: i.alasan,
          fileBukti: i.file_bukti_path ? { path: i.file_bukti_path } as any : undefined,
          status: i.status,
          approvedBy: i.approved_by,
          approvedAt: i.approved_at,
          catatanGuru: i.catatan_guru,
          createdAt: i.created_at,
        })),
        rekapSikap: [],
      };

      return db;
    } catch (e) {
      console.error('Supabase get error, fallback JSON', e);
      if (!this.jsonData) this.jsonData = this.loadJson();
      return this.jsonData;
    }
  }

  async set(data: Database): Promise<void> {
    if (!isSupabaseConfigured()) {
      this.jsonData = data;
      this.saveJson(data);
      return;
    }

    // Untuk Supabase, set tidak dipakai langsung, tapi via individual inserts
    // Simplified: clear dan insert (untuk setup/reset)
    try {
      // Clear tables (hati-hati!)
      await supabase.from('absensi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('izin').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sesi_absen').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('siswa').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('kelas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('guru').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (data.settings) {
        await supabase.from('settings').upsert({
          id: data.settings.id,
          sekolah_nama: data.settings.sekolahNama,
          sekolah_alamat: data.settings.sekolahAlamat,
          lat: data.settings.lat,
          lng: data.settings.lng,
          radius_meter: data.settings.radiusMeter,
          tahun_ajaran: data.settings.tahunAjaran,
          semester: data.settings.semester,
          jam_masuk: data.settings.jamMasuk,
          batas_toleransi: data.settings.batasToleransi,
        });
      }

      // Insert kelas, guru, dll (simplified, real perlu batch)
      for (const k of data.kelas) {
        await supabase.from('kelas').insert({
          id: k.id,
          nama: k.nama,
          tahun_ajaran: k.tahunAjaran,
          semester: k.semester,
          kode_undangan: k.kodeUndangan,
          wali_kelas_id: k.waliKelasId,
          total_siswa: k.totalSiswa,
        });
      }

      for (const g of data.guru) {
        await supabase.from('guru').insert({
          id: g.id,
          nip: g.nip,
          nama: g.nama,
          password_hash: g.passwordHash,
          role: g.role,
          kelas_diampu: g.kelasDiampu,
        });
      }

      for (const s of data.siswa) {
        await supabase.from('siswa').insert({
          id: s.id,
          nisn: s.nisn,
          no_absen: s.noAbsen,
          nama: s.nama,
          kelas_id: s.kelasId,
          pin: s.pin,
          password_hash: s.passwordHash,
          avatar_initial: s.avatarInitial,
          poin_sikap: s.poinSikap,
          predikat: s.predikat,
          kode_undangan: s.kodeUndangan,
          nik: (s as any).nik,
          nik_verified: (s as any).nikVerified,
        });
      }
    } catch (e) {
      console.error('Supabase set error', e);
    }
  }

  async update(updater: (data: Database) => Database): Promise<Database> {
    if (!isSupabaseConfigured()) {
      if (!this.jsonData) this.jsonData = this.loadJson();
      this.jsonData = updater(this.jsonData);
      this.saveJson(this.jsonData);
      return this.jsonData;
    }

    // Untuk Supabase, update via get + set (simplified)
    const current = await this.get();
    const updated = updater(current);
    await this.set(updated);
    return updated;
  }
}

export const supabaseDB = new SupabaseDB();
