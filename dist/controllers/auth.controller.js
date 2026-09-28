"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.resetGuruPassword = exports.registerGuru = exports.loginGuru = exports.joinSiswa = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const jwt_1 = require("../utils/jwt");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const siswaJoinSchema = zod_1.z.object({
    kodeUndangan: zod_1.z.string().min(3),
    nisn: zod_1.z.string().min(5),
    pin: zod_1.z.string().optional(),
    deviceId: zod_1.z.string().optional()
});
const guruLoginSchema = zod_1.z.object({
    nip: zod_1.z.string().min(5),
    password: zod_1.z.string().min(3),
    tahunAjaran: zod_1.z.string().optional()
});
const guruRegisterSchema = zod_1.z.object({
    nip: zod_1.z.string().min(5).max(30),
    nama: zod_1.z.string().min(3).max(100),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    password: zod_1.z.string().min(6).max(100),
    confirmPassword: zod_1.z.string().min(6).optional(),
    role: zod_1.z.enum(['GURU', 'WALI_KELAS', 'ADMIN']).optional(),
    sekolahNama: zod_1.z.string().optional(),
    tahunAjaran: zod_1.z.string().optional()
});
const guruResetSchema = zod_1.z.object({
    nip: zod_1.z.string().min(5),
    nama: zod_1.z.string().min(3),
    newPassword: zod_1.z.string().min(6).max(100),
    confirmPassword: zod_1.z.string().min(6).optional()
});
const joinSiswa = async (req, res) => {
    try {
        const { kodeUndangan, nisn, pin, deviceId } = siswaJoinSchema.parse(req.body);
        const data = db_1.db.get();
        // Cek kelas by kode undangan
        const kelas = data.kelas.find(k => k.kodeUndangan.toUpperCase() === kodeUndangan.toUpperCase());
        if (!kelas) {
            return res.status(404).json({ success: false, message: 'Kode undangan tidak valid. Hubungi Wali Kelas.' });
        }
        // Cek siswa by NISN dan kelas
        const siswa = data.siswa.find(s => s.nisn === nisn && s.kelasId === kelas.id);
        if (!siswa) {
            return res.status(404).json({ success: false, message: 'NISN tidak terdaftar di kelas ini.' });
        }
        // Validasi PIN jika ada
        if (siswa.pin && pin && siswa.pin !== pin) {
            // coba cek password hash juga
            if (siswa.passwordHash) {
                const match = await bcryptjs_1.default.compare(pin, siswa.passwordHash);
                if (!match && siswa.pin !== pin) {
                    return res.status(401).json({ success: false, message: 'PIN salah.' });
                }
            }
            else {
                return res.status(401).json({ success: false, message: 'PIN salah.' });
            }
        }
        // Anti titip absen: cek deviceId
        if (siswa.deviceId && deviceId && siswa.deviceId !== deviceId) {
            console.warn(`⚠️ Device mismatch untuk ${siswa.nama}: ${siswa.deviceId} vs ${deviceId}`);
        }
        // Jika siswa belum punya deviceId, set sekarang
        if (!siswa.deviceId && deviceId) {
            db_1.db.update(d => ({
                ...d,
                siswa: d.siswa.map(s => s.id === siswa.id ? { ...s, deviceId } : s)
            }));
        }
        const token = (0, jwt_1.generateToken)({
            id: siswa.id,
            role: 'SISWA',
            kelasId: siswa.kelasId,
            nisn: siswa.nisn
        });
        res.json({
            success: true,
            message: `Selamat datang, ${siswa.nama}!`,
            data: {
                token,
                siswa: {
                    id: siswa.id,
                    nama: siswa.nama,
                    nisn: siswa.nisn,
                    noAbsen: siswa.noAbsen,
                    kelas: kelas.nama,
                    avatarInitial: siswa.avatarInitial,
                    poinSikap: siswa.poinSikap
                },
                kelas
            }
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal login siswa' });
    }
};
exports.joinSiswa = joinSiswa;
const loginGuru = async (req, res) => {
    try {
        const { nip, password } = guruLoginSchema.parse(req.body);
        const data = db_1.db.get();
        const guru = data.guru.find(g => g.nip === nip.replace(/\s/g, ''));
        if (!guru) {
            return res.status(404).json({ success: false, message: 'NIP tidak terdaftar. Silakan Daftar dulu sebagai Guru.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, guru.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Kata sandi salah. Coba Reset Password jika lupa.' });
        }
        const token = (0, jwt_1.generateToken)({
            id: guru.id,
            role: guru.role,
            nip: guru.nip
        });
        res.json({
            success: true,
            message: `Selamat datang, ${guru.nama}!`,
            data: {
                token,
                guru: {
                    id: guru.id,
                    nama: guru.nama,
                    nip: guru.nip,
                    role: guru.role,
                    kelasDiampu: guru.kelasDiampu
                }
            }
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal login guru' });
    }
};
exports.loginGuru = loginGuru;
// NEW v1.0.26 - DAFTAR GURU MANDIRI (FIX BUG: guru gaada daftar)
const registerGuru = async (req, res) => {
    try {
        const parsed = guruRegisterSchema.parse(req.body);
        const data = db_1.db.get();
        // Validasi confirm password jika ada
        if (parsed.confirmPassword && parsed.password !== parsed.confirmPassword) {
            return res.status(400).json({ success: false, message: 'Password dan Konfirmasi Password tidak sama' });
        }
        const cleanNip = parsed.nip.replace(/\s/g, '');
        // Cek NIP sudah terdaftar?
        if (data.guru.some(g => g.nip === cleanNip)) {
            return res.status(400).json({ success: false, message: `NIP ${cleanNip} sudah terdaftar. Silakan Login atau Reset Password.` });
        }
        // Tentukan role: jika belum ada guru sama sekali -> ADMIN (owner pertama)
        // Jika sudah ada guru -> GURU biasa (atau sesuai request jika WALI_KELAS)
        let finalRole = 'GURU';
        if (data.guru.length === 0) {
            finalRole = 'ADMIN'; // Guru pertama jadi ADMIN otomatis
        }
        else if (parsed.role && ['WALI_KELAS', 'ADMIN'].includes(parsed.role)) {
            // Hanya ADMIN yang bisa bikin WALI_KELAS/ADMIN lain, tapi untuk MVP kita allow jika request
            // Untuk keamanan, jika bukan ADMIN pertama, force jadi GURU kecuali ada kode rahasia
            // Sederhananya: jika sudah ada guru, role default GURU, tapi boleh request WALI_KELAS
            finalRole = parsed.role;
            if (finalRole === 'ADMIN' && data.guru.length > 0) {
                // Cegah sembarang orang jadi ADMIN - hanya jadi GURU
                finalRole = 'GURU';
            }
        }
        const passwordHash = await bcryptjs_1.default.hash(parsed.password, 10);
        const newGuru = {
            id: (0, uuid_1.v4)(),
            nip: cleanNip,
            nama: parsed.nama,
            email: parsed.email || '',
            passwordHash,
            role: finalRole,
            kelasDiampu: [],
            createdAt: new Date().toISOString()
        };
        db_1.db.update(d => ({ ...d, guru: [...d.guru, newGuru] }));
        const token = (0, jwt_1.generateToken)({
            id: newGuru.id,
            role: newGuru.role,
            nip: newGuru.nip
        });
        res.status(201).json({
            success: true,
            message: finalRole === 'ADMIN'
                ? `Pendaftaran berhasil! ${parsed.nama} terdaftar sebagai ADMIN pertama. Silakan Setup Sekolah.`
                : `Pendaftaran berhasil! ${parsed.nama} terdaftar sebagai ${finalRole}.`,
            data: {
                token,
                guru: {
                    id: newGuru.id,
                    nama: newGuru.nama,
                    nip: newGuru.nip,
                    email: newGuru.email,
                    role: newGuru.role
                },
                isFirstGuru: data.guru.length === 0
            }
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal daftar guru' });
    }
};
exports.registerGuru = registerGuru;
// NEW v1.0.26 - RESET PASSWORD GURU (FIX BUG: lupa password)
const resetGuruPassword = async (req, res) => {
    try {
        const { nip, nama, newPassword, confirmPassword } = guruResetSchema.parse(req.body);
        const data = db_1.db.get();
        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Password baru dan konfirmasi tidak sama' });
        }
        const cleanNip = nip.replace(/\s/g, '');
        const guru = data.guru.find(g => g.nip === cleanNip);
        if (!guru) {
            return res.status(404).json({ success: false, message: `NIP ${cleanNip} tidak ditemukan. Silakan Daftar dulu.` });
        }
        // Verifikasi nama harus cocok (case insensitive, minimal 3 huruf pertama cocok)
        const inputNama = nama.trim().toLowerCase();
        const guruNama = guru.nama.toLowerCase();
        // Cek apakah nama mengandung atau mirip (untuk keamanan sederhana)
        // Harus minimal 50% karakter cocok atau mengandung
        const isNamaMatch = guruNama.includes(inputNama) || inputNama.includes(guruNama.split(' ')[0]) || guruNama.split(' ').some(part => inputNama.includes(part) && part.length >= 3);
        if (!isNamaMatch) {
            return res.status(401).json({ success: false, message: 'Nama tidak cocok dengan NIP tersebut. Verifikasi gagal.' });
        }
        const newHash = await bcryptjs_1.default.hash(newPassword, 10);
        db_1.db.update(d => ({
            ...d,
            guru: d.guru.map(g => g.id === guru.id ? { ...g, passwordHash: newHash, updatedAt: new Date().toISOString() } : g)
        }));
        res.json({
            success: true,
            message: `Password untuk ${guru.nama} (NIP ${guru.nip}) berhasil direset. Silakan Login dengan password baru.`,
            data: {
                nip: guru.nip,
                nama: guru.nama
            }
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, message: 'Validasi gagal', errors: err.errors });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal reset password' });
    }
};
exports.resetGuruPassword = resetGuruPassword;
const getMe = async (req, res) => {
    try {
        const data = db_1.db.get();
        const user = req.user;
        if (user.role === 'SISWA') {
            const siswa = data.siswa.find(s => s.id === user.id);
            const kelas = data.kelas.find(k => k.id === siswa?.kelasId);
            return res.json({ success: true, data: { ...siswa, kelas, role: 'SISWA' } });
        }
        else {
            const guru = data.guru.find(g => g.id === user.id);
            return res.json({ success: true, data: { ...guru, role: guru?.role } });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Gagal ambil profil' });
    }
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map