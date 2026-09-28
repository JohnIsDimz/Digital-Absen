import { Router } from 'express';
import { joinSiswa, loginGuru, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Siswa join via kode undangan
router.post('/siswa/join', joinSiswa);

// Guru login via NIP
router.post('/guru/login', loginGuru);

// Get current user
router.get('/me', authenticate, getMe);

export default router;
