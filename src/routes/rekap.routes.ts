import { Router } from 'express';
import { getRekapKehadiran, getRekapSikap, getExportPreview } from '../controllers/rekap.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.get('/kehadiran', authenticate, getRekapKehadiran);
router.get('/sikap', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), getRekapSikap);
router.get('/export/preview/:siswaId', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), getExportPreview);

// Mock export endpoint - generate PDF/ZIP
router.get('/export/download', authenticate, authorize('WALI_KELAS', 'GURU', 'ADMIN'), async (req, res) => {
  // Untuk demo, kita return JSON, di real app akan generate PDF ZIP
  const { format } = req.query; // pdf, xlsx, ringkas
  res.json({
    success: true,
    message: `Export ${format || 'PDF ZIP'} sedang diproses`,
    data: {
      fileName: `Rapor_Sikap_XII_RPL_1_${new Date().toISOString().split('T')[0]}.zip`,
      size: '4.8 MB',
      totalDokumen: '36 Siswa Lengkap',
      format: format || 'PDF',
      downloadUrl: `/api/rekap/export/file/${format || 'pdf'}`,
      status: 'Siap Download'
    }
  });
});

export default router;
