"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const absensi_controller_1 = require("../controllers/absensi.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.post('/scan', auth_1.authenticate, (0, auth_1.authorize)('SISWA'), absensi_controller_1.scanAbsen);
router.get('/my', auth_1.authenticate, (0, auth_1.authorize)('SISWA'), absensi_controller_1.getMyAbsensi);
router.post('/manual', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), absensi_controller_1.inputManual);
exports.default = router;
//# sourceMappingURL=absensi.routes.js.map