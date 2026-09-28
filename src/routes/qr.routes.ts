import { Router } from 'express';
import { generateQRSession, getActiveQR, lockSession } from '../controllers/qr.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.post('/generate', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), generateQRSession);
router.get('/active', authenticate, getActiveQR);
router.put('/:sesiId/lock', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), lockSession);

export default router;
