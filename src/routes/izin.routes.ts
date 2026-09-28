import { Router } from 'express';
import { ajukanIzin, getMyIzin, getPendingIzin, approveIzin, getAllIzin } from '../controllers/izin.controller';
import { authenticate, authorize } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format file harus JPG, PNG, atau PDF'));
  }
});

const router = Router();

router.post('/', authenticate, authorize('SISWA'), upload.single('bukti'), ajukanIzin);
router.get('/my', authenticate, authorize('SISWA'), getMyIzin);
router.get('/pending', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), getPendingIzin);
router.get('/all', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), getAllIzin);
router.put('/:id/approve', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), approveIzin);

export default router;
