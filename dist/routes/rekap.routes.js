"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rekap_controller_1 = require("../controllers/rekap.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/kehadiran', auth_1.authenticate, rekap_controller_1.getRekapKehadiran);
router.get('/sikap', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), rekap_controller_1.getRekapSikap);
router.get('/export/preview/:siswaId', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), rekap_controller_1.getExportPreview);
// Mock export endpoint - generate PDF/ZIP
router.get('/export/download', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), async (req, res) => {
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
exports.default = router;
//# sourceMappingURL=rekap.routes.js.map