import fs from 'fs';
import path from 'path';
import { Kelas, Guru, Siswa, SesiAbsen, Absensi, PengajuanIzin, RekapSikap } from '../types';

export interface Settings {
  id: string;
  sekolahNama: string;
  sekolahAlamat: string;
  lat: number;
  lng: number;
  radiusMeter: number;
  tahunAjaran: string; // 2026/2027
  semester: 'GANJIL' | 'GENAP';
  jamMasuk: string;
  batasToleransi: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface Database {
  settings: Settings | null; // v0.4 - Lokasi & Tahun Dinamis
  kelas: Kelas[];
  guru: Guru[];
  siswa: Siswa[];
  sesiAbsen: SesiAbsen[];
  absensi: Absensi[];
  izin: PengajuanIzin[];
  rekapSikap: RekapSikap[];
}

const DB_PATH = path.join(__dirname, '../../data/database.json');

export const defaultDB: Database = {
  settings: null,
  kelas: [],
  guru: [],
  siswa: [],
  sesiAbsen: [],
  absensi: [],
  izin: [],
  rekapSikap: []
};

class JsonDB {
  private data: Database;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): Database {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Migrate old DB without settings
        if (!parsed.settings && parsed.kelas !== undefined) {
          return { settings: null, ...parsed };
        }
        return parsed;
      }
    } catch (e) {
      console.error('Gagal load DB, pakai default:', e);
    }
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.save(defaultDB);
    return defaultDB;
  }

  private save(data: Database) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Gagal save DB:', e);
    }
  }

  get(): Database {
    return this.data;
  }

  set(data: Database) {
    this.data = data;
    this.save(data);
  }

  update(updater: (data: Database) => Database) {
    this.data = updater(this.data);
    this.save(this.data);
    return this.data;
  }
}

export const db = new JsonDB(DB_PATH);
