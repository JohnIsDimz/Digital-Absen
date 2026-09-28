import { Router } from 'express';
import { scanAbsen, getMyAbsensi, inputManual } from '../controllers/absensi.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.post('/scan', authenticate, authorize('SISWA'), scanAbsen);
router.get('/my', authenticate, authorize('SISWA'), getMyAbsensi);
router.post('/manual', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), inputManual);

export default router;
