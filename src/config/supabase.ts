/**
 * Supabase Config - Ganti JSON file dengan Postgres Supabase
 * Biar database persistent di Vercel, tidak hilang tiap deploy!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Config dari env atau supabase dashboard
const supabaseUrl = process.env.SUPABASE_URL || 'https://xxxx.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || 'anon-key-xxxx';

if (!process.env.SUPABASE_URL) {
  console.warn('⚠️ SUPABASE_URL belum di-set, pakai JSON fallback. Set di .env untuk pakai Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Check if Supabase configured
export const isSupabaseConfigured = () => {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_URL.includes('xxxx');
};

/**
 * SQL Schema untuk Supabase - Jalankan di Supabase SQL Editor
 * 
 * Buka https://supabase.com/dashboard/project/xxxx/sql
 * Paste dan Run SQL di bawah ini
 */

export const SUPABASE_SQL_SCHEMA = `
-- AbsenSiswa Supabase Schema v0.5.5 - 2026/2027
-- Jalankan di Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Settings (1 row)
create table if not exists settings (
  id uuid primary key default uuid_generate_v4(),
  sekolah_nama text not null default 'SMK N 1 BANDUNG',
  sekolah_alamat text,
  lat double precision not null default -6.914744,
  lng double precision not null default 107.60981,
  radius_meter int not null default 50,
  tahun_ajaran text not null default '2026/2027',
  semester text not null default 'GANJIL',
  jam_masuk text not null default '07:00',
  batas_toleransi text not null default '07:15',
  updated_at timestamp with time zone default now(),
  updated_by uuid
);

-- Kelas
create table if not exists kelas (
  id uuid primary key default uuid_generate_v4(),
  nama text not null,
  tahun_ajaran text not null default '2026/2027',
  semester text not null default 'GANJIL',
  kode_undangan text unique not null,
  wali_kelas_id uuid,
  total_siswa int not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Guru
create table if not exists guru (
  id uuid primary key default uuid_generate_v4(),
  nip text unique not null,
  nama text not null,
  email text,
  password_hash text not null,
  role text not null default 'WALI_KELAS',
  kelas_diampu uuid[] default '{}',
  avatar_url text,
  nik text,
  nik_verified boolean default false,
  created_at timestamp with time zone default now()
);

-- Siswa
create table if not exists siswa (
  id uuid primary key default uuid_generate_v4(),
  nisn text not null,
  no_absen int not null,
  nama text not null,
  kelas_id uuid references kelas(id) on delete cascade,
  pin text,
  password_hash text,
  device_id text,
  avatar_initial text,
  ortu_whatsapp text,
  poin_sikap int not null default 100,
  predikat text not null default 'A',
  kode_undangan text,
  nik text,
  nik_verified boolean default false,
  nik_verified_at timestamp with time zone,
  nik_verified_by uuid,
  ktp_foto_path text,
  created_at timestamp with time zone default now(),
  unique(nisn, kelas_id)
);

-- Sesi Absen (QR)
create table if not exists sesi_absen (
  id uuid primary key default uuid_generate_v4(),
  kelas_id uuid references kelas(id) on delete cascade,
  tanggal date not null default current_date,
  jam_masuk text not null default '07:00',
  batas_toleransi text not null default '07:15',
  qr_code text unique not null,
  qr_payload text,
  qr_expires_at timestamp with time zone,
  is_locked boolean default false,
  created_by uuid,
  created_at timestamp with time zone default now()
);

-- Absensi
create table if not exists absensi (
  id uuid primary key default uuid_generate_v4(),
  siswa_id uuid references siswa(id) on delete cascade,
  sesi_id uuid references sesi_absen(id) on delete cascade,
  tanggal date not null default current_date,
  jam_checkin text not null,
  jam_checkin_full timestamp with time zone default now(),
  status text not null default 'HADIR',
  keterlambatan_menit int default 0,
  lokasi_lat double precision,
  lokasi_lng double precision,
  lokasi_nama text,
  jarak_meter int,
  is_within_geofence boolean default true,
  face_verified boolean default false,
  device_id text,
  created_at timestamp with time zone default now(),
  unique(siswa_id, tanggal)
);

-- Izin
create table if not exists izin (
  id uuid primary key default uuid_generate_v4(),
  siswa_id uuid references siswa(id) on delete cascade,
  kategori text not null,
  tgl_mulai date not null,
  tgl_selesai date not null,
  durasi_hari int,
  alasan text not null,
  file_bukti_path text,
  status text not null default 'PENDING',
  approved_by uuid,
  approved_at timestamp with time zone,
  catatan_guru text,
  created_at timestamp with time zone default now()
);

-- Rekap Sikap
create table if not exists rekap_sikap (
  id uuid primary key default uuid_generate_v4(),
  siswa_id uuid references siswa(id) on delete cascade,
  semester text not null,
  tahun_ajaran text not null,
  nilai int,
  predikat text,
  catatan text,
  created_at timestamp with time zone default now()
);

-- Indexes untuk performa
create index if not exists idx_siswa_kelas on siswa(kelas_id);
create index if not exists idx_siswa_nisn on siswa(nisn);
create index if not exists idx_siswa_nik on siswa(nik);
create index if not exists idx_absensi_siswa_tanggal on absensi(siswa_id, tanggal);
create index if not exists idx_sesi_kelas_tanggal on sesi_absen(kelas_id, tanggal);
create index if not exists idx_izin_siswa on izin(siswa_id);
create index if not exists idx_izin_status on izin(status);

-- Enable RLS (Row Level Security) - untuk production, set policy
-- Untuk development, disable RLS atau allow all
alter table settings disable row level security;
alter table kelas disable row level security;
alter table guru disable row level security;
alter table siswa disable row level security;
alter table sesi_absen disable row level security;
alter table absensi disable row level security;
alter table izin disable row level security;
alter table rekap_sikap disable row level security;

-- Insert default settings jika belum ada
insert into settings (sekolah_nama, lat, lng, tahun_ajaran)
values ('SMK N 1 BANDUNG', -6.914744, 107.60981, '2026/2027')
on conflict do nothing;
`;
