"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const izin_controller_1 = require("../controllers/izin.controller");
const auth_1 = require("../middlewares/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowed.includes(file.mimetype))
            cb(null, true);
        else
            cb(new Error('Format file harus JPG, PNG, atau PDF'));
    }
});
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('SISWA'), upload.single('bukti'), izin_controller_1.ajukanIzin);
router.get('/my', auth_1.authenticate, (0, auth_1.authorize)('SISWA'), izin_controller_1.getMyIzin);
router.get('/pending', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), izin_controller_1.getPendingIzin);
router.get('/all', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), izin_controller_1.getAllIzin);
router.put('/:id/approve', auth_1.authenticate, (0, auth_1.authorize)('WALI_KELAS', 'GURU', 'ADMIN'), izin_controller_1.approveIzin);
exports.default = router;
//# sourceMappingURL=izin.routes.js.map