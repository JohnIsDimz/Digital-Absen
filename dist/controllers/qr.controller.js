"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockSession = exports.getActiveQR = exports.generateQRSession = void 0;
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const qr_1 = require("../utils/qr");
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const socket_1 = require("../config/socket");
const generateQRSession = async (req, res) => {
    try {
        const { kelasId } = req.body;
        const guruId = req.user.id;
        const data = db_1.db.get();
        // Cari kelas - jika tidak ada kelasId, ambil kelas yang diampu guru pertama
        let targetKelasId = kelasId;
        if (!targetKelasId) {
            const guru = data.guru.find(g => g.id === guruId);
            targetKelasId = guru?.kelasDiampu?.[0];
            if (!targetKelasId) {
                targetKelasId = data.kelas[0]?.id;
            }
        }
        const kelas = data.kelas.find(k => k.id === targetKelasId);
        if (!kelas) {
            return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
        }
        const today = (0, dayjs_1.default)().format('YYYY-MM-DD');
        // Cek sesi hari ini, jika ada update, jika tidak create baru
        let sesi = data.sesiAbsen.find(s => s.kelasId === targetKelasId && s.tanggal === today && !s.isLocked);
        // v0.5.4 FIX: Pakai lokasi dari settings jika ada (dinamis Bandung/Surabaya), bukan hardcode Jakarta
        const schoolLat = data.settings?.lat || env_1.env.SCHOOL_LAT;
        const schoolLng = data.settings?.lng || env_1.env.SCHOOL_LNG;
        const payload = (0, qr_1.generateQRPayload)({
            sesiId: sesi?.id || (0, uuid_1.v4)(),
            kelasId: targetKelasId,
            tanggal: today,
            lat: schoolLat,
            lng: schoolLng,
            expirySeconds: env_1.env.QR_REFRESH_SECONDS
        });
        const qrDataURL = await (0, qr_1.generateQRCodeDataURL)(payload);
        if (sesi) {
            // Update existing sesi
            db_1.db.update(d => ({
                ...d,
                sesiAbsen: d.sesiAbsen.map(s => s.id === sesi.id ? {
                    ...s,
                    qrCode: payload.token,
                    qrPayload: JSON.stringify(payload),
                    qrExpiresAt: payload.exp,
                    createdAt: new Date().toISOString()
                } : s)
            }));
            sesi = { ...sesi, qrCode: payload.token, qrPayload: JSON.stringify(payload), qrExpiresAt: payload.exp };
        }
        else {
            // Create new sesi
            const newSesi = {
                id: payload.sesiId,
                kelasId: targetKelasId,
                tanggal: today,
                jamMasuk: env_1.env.JAM_MASUK,
                batasToleransi: env_1.env.BATAS_TOLERANSI,
                qrCode: payload.token,
                qrPayload: JSON.stringify(payload),
                qrExpiresAt: payload.exp,
                isLocked: false,
                createdBy: guruId,
                createdAt: new Date().toISOString()
            };
            db_1.db.update(d => ({
                ...d,
                sesiAbsen: [...d.sesiAbsen, newSesi]
            }));
            sesi = newSesi;
        }
        // Real-time emit v0.2
        try {
            const io = (0, socket_1.getIO)();
            io.to(`kelas:${targetKelasId}`).emit('siswa:qr-update', {
                qrToken: payload.token,
                payload,
                dataURL: qrDataURL,
                expiresAt: payload.exp,
                kelasId: targetKelasId,
                timestamp: new Date().toISOString()
            });
        }
        catch (e) {
            console.log('Socket not ready for QR emit');
        }
        res.json({
            success: true,
            message: 'QR Sesi berhasil dibuat - Real-time via Socket.IO - Refresh per 30 detik',
            data: {
                sesi,
                qr: {
                    token: payload.token,
                    payload,
                    dataURL: qrDataURL,
                    expiresAt: payload.exp,
                    refreshIn: env_1.env.QR_REFRESH_SECONDS
                },
                kelas,
                realtime: true
            }
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal generate QR' });
    }
};
exports.generateQRSession = generateQRSession;
const getActiveQR = async (req, res) => {
    try {
        const data = db_1.db.get();
        const today = (0, dayjs_1.default)().format('YYYY-MM-DD');
        const kelasId = req.query.kelasId || data.kelas[0]?.id;
        const sesi = data.sesiAbsen
            .filter(s => s.kelasId === kelasId && s.tanggal === today)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (!sesi) {
            return res.status(404).json({ success: false, message: 'Belum ada sesi aktif hari ini. Guru perlu buka sesi QR.' });
        }
        const payload = JSON.parse(sesi.qrPayload);
        const qrDataURL = await (0, qr_1.generateQRCodeDataURL)(payload);
        res.json({
            success: true,
            data: {
                sesi,
                qr: {
                    dataURL: qrDataURL,
                    payload,
                    isExpired: (0, dayjs_1.default)().isAfter((0, dayjs_1.default)(sesi.qrExpiresAt)),
                    expiresAt: sesi.qrExpiresAt
                }
            }
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal ambil QR aktif' });
    }
};
exports.getActiveQR = getActiveQR;
const lockSession = async (req, res) => {
    try {
        const { sesiId } = req.params;
        db_1.db.update(d => ({
            ...d,
            sesiAbsen: d.sesiAbsen.map(s => s.id === sesiId ? { ...s, isLocked: true } : s)
        }));
        res.json({ success: true, message: 'Sesi berhasil dikunci. Tidak ada absen masuk lagi.' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Gagal kunci sesi' });
    }
};
exports.lockSession = lockSession;
//# sourceMappingURL=qr.controller.js.map