import { Router } from 'express';
import { getDashboardSiswa, getDashboardGuru, getDaftarSiswa } from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.get('/siswa', authenticate, authorize('SISWA'), getDashboardSiswa);
router.get('/guru', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), getDashboardGuru);
router.get('/siswa/list', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), getDaftarSiswa);

export default router;
