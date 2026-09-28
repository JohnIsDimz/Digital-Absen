# Digital Absensi

Aplikasi absensi siswa dan guru berbasis **Express.js, TypeScript, HTML, dan Socket.IO** dengan antarmuka neo-brutalist.

Versi frontend pada rilis ini: **v1.0.28**

## Fitur

- Login guru dan siswa.
- Dashboard terpisah untuk guru dan siswa.
- Auth guard berbasis role untuk mencegah dashboard tertukar.
- Logout yang hanya menghapus data autentikasi dan kembali ke halaman welcome.
- Generate dan scan QR absensi.
- Validasi izin/sakit.
- Rekap kehadiran.
- Pengelolaan kelas dan siswa.
- Pengaturan sekolah, lokasi geofence, tahun ajaran, dan semester.
- Verifikasi NIK melalui OCR KTP.
- Socket.IO untuk pembaruan realtime.
- Deployment serverless melalui Vercel.

## Persyaratan

- Node.js 18 atau lebih baru.
- npm.
- Untuk fitur Supabase/OCR, siapkan environment variable yang diperlukan.

## Instalasi Lokal

```bash
git clone https://github.com/JohnIsDimz/Digital-Absensi.git
cd Digital-Absensi
npm ci
npm run build
npm start
```

Aplikasi berjalan pada port `3000` secara default. Buka:

- `http://localhost:3000/`
- `http://localhost:3000/api/health`

Untuk mode pengembangan:

```bash
npm run dev
```

## Konfigurasi Environment

Buat file `.env` lokal. Jangan commit file ini ke repository.

Contoh minimum:

```env
PORT=3000
JWT_SECRET=ganti-dengan-secret-yang-kuat
JWT_EXPIRES_IN=7d
CURRENT_YEAR=2026
TAHUN_AJARAN=2026/2027
SEMESTER=GANJIL
SCHOOL_NAME=Nama Sekolah
SCHOOL_ADDRESS=Alamat Sekolah
SCHOOL_LAT=-6.914744
SCHOOL_LNG=107.60981
GEOFENCE_RADIUS=100
JAM_MASUK=07:00
BATAS_TOLERANSI=07:15
```

Untuk integrasi Supabase, tambahkan nilai URL dan key sesuai konfigurasi server yang digunakan. Gunakan secret yang berbeda untuk development dan production.

## Deploy ke Vercel

Repository sudah menggunakan entrypoint serverless `api/index.ts` dan konfigurasi `vercel.json`.

1. Import repository ke Vercel.
2. Tambahkan environment variable production di Vercel Project Settings.
3. Deploy branch `main`.
4. Uji endpoint:

```text
https://<domain-anda>/api/health
```

Respons HTTP `200` dengan `success: true` menandakan function utama berhasil dijalankan.

## Troubleshooting

### `FUNCTION_INVOCATION_FAILED`

Pastikan deployment memakai `api/index.ts`, bukan entrypoint lama yang memanggil file `dist/index.js` secara manual. Jalankan pemeriksaan lokal:

```bash
npm ci
npm run build
```

Jika build berhasil, pastikan deployment terbaru sudah selesai dan cek kembali `/api/health`.

### `npm run build` gagal

Jalankan ulang dari instalasi bersih:

```bash
rm -rf node_modules dist
npm ci
npm run build
```

Baca file dan nomor baris pada pesan TypeScript. Jangan menjalankan `npm audit fix --force` tanpa review karena dapat menaikkan versi dependency secara breaking.

### Logout kembali ke halaman yang salah

Gunakan fungsi `logout()` dari `public/js/app.js` atau `AuthGuard.logoutAndRedirect()`. Keduanya menghapus token/user session tanpa menghapus `device_id`, lalu mengarahkan pengguna ke `/welcome.html`.

### Dashboard guru dan siswa tertukar

Periksa token JWT dan role pengguna. `public/js/auth-guard.js` mengizinkan:

- `SISWA` hanya ke `dashboard-siswa.html`.
- `GURU`, `WALI_KELAS`, dan `ADMIN` ke `dashboard-guru.html`.

Jika token lama tersimpan di browser, gunakan tombol logout lalu login ulang.

### Halaman tampil tetapi data tidak muncul

1. Buka `/api/health`.
2. Pastikan endpoint API mengembalikan HTTP `200`.
3. Pastikan token autentikasi masih valid.
4. Pastikan data kelas/guru sudah dibuat melalui `/setup.html` atau API setup.
5. Periksa Console browser dan log deployment.

## Perintah NPM

| Perintah | Keterangan |
|---|---|
| `npm run dev` | Menjalankan server development dengan reload otomatis |
| `npm run build` | Compile TypeScript ke folder `dist` |
| `npm start` | Menjalankan hasil compile dari `dist` |
| `npm run seed` | Menjalankan seed database kosong |
| `npm run seed:zero` | Reset database ke kondisi kosong |

## Catatan Data

`data/database.json` digunakan sebagai penyimpanan lokal sederhana. Untuk production dan data penting, gunakan penyimpanan persisten seperti Supabase atau database terkelola. Jangan menyimpan data pribadi production di repository public.

## Lisensi

MIT
