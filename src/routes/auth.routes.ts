import { Router } from 'express';
import { joinSiswa, loginGuru, registerGuru, resetGuruPassword, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Siswa join via kode undangan
router.post('/siswa/join', joinSiswa);

// Guru login via NIP
router.post('/guru/login', loginGuru);

// NEW v1.0.26 - FIX BUG: Guru gaada daftar & reset password
// Daftar Guru Mandiri (public, tanpa auth - guru pertama jadi ADMIN)
router.post('/guru/register', registerGuru);

// Reset Password Guru (public, verifikasi NIP + Nama)
router.post('/guru/reset-password', resetGuruPassword);

// Alias untuk kompatibilitas
router.post('/guru/forgot-password', resetGuruPassword);

// Get current user
router.get('/me', authenticate, getMe);

export default router;
