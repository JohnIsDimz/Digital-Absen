"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Siswa join via kode undangan
router.post('/siswa/join', auth_controller_1.joinSiswa);
// Guru login via NIP
router.post('/guru/login', auth_controller_1.loginGuru);
// NEW v1.0.26 - FIX BUG: Guru gaada daftar & reset password
// Daftar Guru Mandiri (public, tanpa auth - guru pertama jadi ADMIN)
router.post('/guru/register', auth_controller_1.registerGuru);
// Reset Password Guru (public, verifikasi NIP + Nama)
router.post('/guru/reset-password', auth_controller_1.resetGuruPassword);
// Alias untuk kompatibilitas
router.post('/guru/forgot-password', auth_controller_1.resetGuruPassword);
// Get current user
router.get('/me', auth_1.authenticate, auth_controller_1.getMe);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map