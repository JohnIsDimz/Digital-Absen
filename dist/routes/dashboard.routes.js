"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/siswa', auth_1.authenticate, (0, auth_1.authorize)('SISWA'), dashboard_controller_1.getDashboardSiswa);
router.get('/guru', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), dashboard_controller_1.getDashboardGuru);
router.get('/siswa/list', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), dashboard_controller_1.getDaftarSiswa);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map