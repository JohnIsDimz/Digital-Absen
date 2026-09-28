"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const socket_1 = require("../config/socket");
const router = (0, express_1.Router)();
// Schema v0.4 - Lokasi Dinamis + Tahun 2026
const settingsSchema = zod_1.z.object({
    sekolahNama: zod_1.z.string().min(3).optional(),
    sekolahAlamat: zod_1.z.string().min(5).optional(),
    lat: zod_1.z.number().min(-90).max(90).optional(),
    lng: zod_1.z.number().min(-180).max(180).optional(),
    radiusMeter: zod_1.z.number().min(10).max(1000).optional(),
    tahunAjaran: zod_1.z.string().regex(/^\d{4}\/\d{4}$/).optional(), // 2026/2027
    semester: zod_1.z.enum(['GANJIL', 'GENAP']).optional(),
    jamMasuk: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional(), // 07:00
    batasToleransi: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional(),
});
// GET settings - lokasi & tahun
router.get('/', (req, res) => {
    const data = db_1.db.get();
    const settings = data.settings || {
        id: 'default',
        sekolahNama: env_1.env.SCHOOL_NAME,
        sekolahAlamat: env_1.env.SCHOOL_ADDRESS,
        lat: env_1.env.SCHOOL_LAT,
        lng: env_1.env.SCHOOL_LNG,
        radiusMeter: env_1.env.GEOFENCE_RADIUS,
        tahunAjaran: env_1.env.TAHUN_AJARAN, // 2026/2027
        semester: env_1.env.SEMESTER,
        jamMasuk: env_1.env.JAM_MASUK,
        batasToleransi: env_1.env.BATAS_TOLERANSI,
        updatedAt: new Date().toISOString(),
        source: 'env - default Jakarta, bisa diganti via PUT /api/settings'
    };
    res.json({
        success: true,
        version: '0.4.0 - Tahun 2026 + Lokasi Dinamis',
        data: settings,
        info: {
            tahunSekarang: env_1.env.CURRENT_YEAR, // 2026
            tahunAjaranDefault: `${env_1.env.CURRENT_YEAR}/${env_1.env.NEXT_YEAR}`, // 2026/2027
            lokasiDefault: 'Jakarta (-6.182339, 106.832) - bisa diganti untuk semua kota',
            caraGanti: 'PUT /api/settings dengan lat,lng, sekolahNama, tahunAjaran'
        }
    });
});
// PUT update settings - Lokasi bisa diganti untuk semua kota
router.put('/', (req, res) => {
    try {
        const parsed = settingsSchema.parse(req.body);
        const data = db_1.db.get();
        const currentSettings = data.settings || {
            id: (0, uuid_1.v4)(),
            sekolahNama: env_1.env.SCHOOL_NAME,
            sekolahAlamat: env_1.env.SCHOOL_ADDRESS,
            lat: env_1.env.SCHOOL_LAT,
            lng: env_1.env.SCHOOL_LNG,
            radiusMeter: env_1.env.GEOFENCE_RADIUS,
            tahunAjaran: env_1.env.TAHUN_AJARAN,
            semester: env_1.env.SEMESTER,
            jamMasuk: env_1.env.JAM_MASUK,
            batasToleransi: env_1.env.BATAS_TOLERANSI,
            updatedAt: new Date().toISOString()
        };
        const updatedSettings = {
            ...currentSettings,
            id: currentSettings.id || (0, uuid_1.v4)(),
            sekolahNama: parsed.sekolahNama || currentSettings.sekolahNama,
            sekolahAlamat: parsed.sekolahAlamat || currentSettings.sekolahAlamat,
            lat: parsed.lat !== undefined ? parsed.lat : currentSettings.lat,
            lng: parsed.lng !== undefined ? parsed.lng : currentSettings.lng,
            radiusMeter: parsed.radiusMeter || currentSettings.radiusMeter,
            tahunAjaran: parsed.tahunAjaran || currentSettings.tahunAjaran,
            semester: parsed.semester || currentSettings.semester,
            jamMasuk: parsed.jamMasuk || currentSettings.jamMasuk,
            batasToleransi: parsed.batasToleransi || currentSettings.batasToleransi,
            updatedAt: new Date().toISOString()
        };
        db_1.db.update(d => ({
            ...d,
            settings: updatedSettings
        }));
        try {
            const io = (0, socket_1.getIO)();
            io.emit('settings:update', { settings: updatedSettings, message: `Lokasi & Tahun diupdate: ${updatedSettings.sekolahNama} - ${updatedSettings.tahunAjaran}` });
        }
        catch { }
        res.json({
            success: true,
            message: `Settings berhasil diupdate v0.4 - Lokasi & Tahun 2026 - ${updatedSettings.sekolahNama}`,
            data: {
                before: {
                    sekolahNama: currentSettings.sekolahNama,
                    lat: currentSettings.lat,
                    lng: currentSettings.lng,
                    tahunAjaran: currentSettings.tahunAjaran
                },
                after: updatedSettings,
                changed: Object.keys(parsed),
                info: parsed.lat && parsed.lng ? `Lokasi diganti dari Jakarta ke ${updatedSettings.sekolahNama} (${parsed.lat}, ${parsed.lng}) - bukan cuma Jakarta lagi` : `Tahun diganti ke ${updatedSettings.tahunAjaran}`
            }
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal update settings' });
    }
});
// GET daftar kota preset - untuk semua daerah
router.get('/kota-preset', (req, res) => {
    const kotaPreset = [
        { nama: 'SMK NEGERI 1 JAKARTA', alamat: 'Jl. Budi Utomo No. 7, Jakarta Pusat', lat: -6.182339, lng: 106.832, radius: 50 },
        { nama: 'SMK NEGERI 1 BANDUNG', alamat: 'Jl. Wastukencana No. 3, Bandung', lat: -6.914744, lng: 107.60981, radius: 50 },
        { nama: 'SMK NEGERI 1 SURABAYA', alamat: 'Jl. Smea No. 4, Surabaya', lat: -7.275847, lng: 112.7118, radius: 50 },
        { nama: 'SMK NEGERI 1 YOGYAKARTA', alamat: 'Jl. Kemetiran Kidul No. 35, Yogyakarta', lat: -7.8014, lng: 110.3644, radius: 50 },
        { nama: 'SMK NEGERI 1 SEMARANG', alamat: 'Jl. Dr. Cipto No. 121, Semarang', lat: -6.966667, lng: 110.416664, radius: 50 },
        { nama: 'SMK NEGERI 1 MEDAN', alamat: 'Jl. Sindoro No. 1, Medan', lat: 3.5952, lng: 98.6722, radius: 50 },
        { nama: 'SMK NEGERI 1 MAKASSAR', alamat: 'Jl. Sunu No. 162, Makassar', lat: -5.147665, lng: 119.432732, radius: 50 },
        { nama: 'SMK NEGERI 1 DENPASAR', alamat: 'Jl. Hos Cokroaminoto No. 84, Denpasar', lat: -8.65, lng: 115.216667, radius: 50 },
        { nama: 'CUSTOM - Input Manual', alamat: 'Isi alamat sekolah kamu', lat: 0, lng: 0, radius: 50 },
    ];
    res.json({
        success: true,
        version: '0.4.0 - Lokasi Dinamis Semua Kota',
        data: kotaPreset,
        total: kotaPreset.length,
        message: 'Preset lokasi untuk semua kota/daerah di Indonesia - tidak cuma Jakarta',
        caraPakai: 'Pilih salah satu, lalu PUT /api/settings dengan lat,lng, sekolahNama'
    });
});
// POST set lokasi dari preset
router.post('/set-kota/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const kotaPreset = [
        { nama: 'SMK NEGERI 1 JAKARTA', alamat: 'Jl. Budi Utomo No. 7, Jakarta Pusat', lat: -6.182339, lng: 106.832, radius: 50 },
        { nama: 'SMK NEGERI 1 BANDUNG', alamat: 'Jl. Wastukencana No. 3, Bandung', lat: -6.914744, lng: 107.60981, radius: 50 },
        { nama: 'SMK NEGERI 1 SURABAYA', alamat: 'Jl. Smea No. 4, Surabaya', lat: -7.275847, lng: 112.7118, radius: 50 },
        { nama: 'SMK NEGERI 1 YOGYAKARTA', alamat: 'Jl. Kemetiran Kidul No. 35, Yogyakarta', lat: -7.8014, lng: 110.3644, radius: 50 },
        { nama: 'SMK NEGERI 1 SEMARANG', alamat: 'Jl. Dr. Cipto No. 121, Semarang', lat: -6.966667, lng: 110.416664, radius: 50 },
        { nama: 'SMK NEGERI 1 MEDAN', alamat: 'Jl. Sindoro No. 1, Medan', lat: 3.5952, lng: 98.6722, radius: 50 },
        { nama: 'SMK NEGERI 1 MAKASSAR', alamat: 'Jl. Sunu No. 162, Makassar', lat: -5.147665, lng: 119.432732, radius: 50 },
        { nama: 'SMK NEGERI 1 DENPASAR', alamat: 'Jl. Hos Cokroaminoto No. 84, Denpasar', lat: -8.65, lng: 115.216667, radius: 50 },
    ];
    if (index < 0 || index >= kotaPreset.length) {
        return res.status(400).json({ success: false, message: 'Index kota tidak valid' });
    }
    const kota = kotaPreset[index];
    const data = db_1.db.get();
    const newSettings = {
        id: data.settings?.id || (0, uuid_1.v4)(),
        sekolahNama: kota.nama,
        sekolahAlamat: kota.alamat,
        lat: kota.lat,
        lng: kota.lng,
        radiusMeter: kota.radius,
        tahunAjaran: data.settings?.tahunAjaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        semester: data.settings?.semester || 'GANJIL',
        jamMasuk: data.settings?.jamMasuk || '07:00',
        batasToleransi: data.settings?.batasToleransi || '07:15',
        updatedAt: new Date().toISOString()
    };
    db_1.db.update(d => ({ ...d, settings: newSettings }));
    try {
        const io = (0, socket_1.getIO)();
        io.emit('settings:update', { settings: newSettings, message: `Lokasi diganti ke ${kota.nama}` });
    }
    catch { }
    res.json({ success: true, message: `Lokasi berhasil diganti ke ${kota.nama} - v0.4`, data: newSettings });
});
exports.default = router;
//# sourceMappingURL=settings.routes.js.map