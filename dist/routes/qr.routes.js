"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qr_controller_1 = require("../controllers/qr.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.post('/generate', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), qr_controller_1.generateQRSession);
router.get('/active', auth_1.authenticate, qr_controller_1.getActiveQR);
router.put('/:sesiId/lock', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), qr_controller_1.lockSession);
exports.default = router;
//# sourceMappingURL=qr.routes.js.map