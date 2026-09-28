"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isQRExpired = exports.generateQRCodeDataURL = exports.generateQRPayload = exports.generateQRToken = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const generateQRToken = () => (0, uuid_1.v4)();
exports.generateQRToken = generateQRToken;
const generateQRPayload = (data) => {
    const token = (0, exports.generateQRToken)();
    const exp = (0, dayjs_1.default)().add(data.expirySeconds, 'second').toISOString();
    return {
        sesiId: data.sesiId,
        kelasId: data.kelasId,
        token,
        tanggal: data.tanggal,
        exp,
        lat: data.lat,
        lng: data.lng
    };
};
exports.generateQRPayload = generateQRPayload;
const generateQRCodeDataURL = async (payload) => {
    const json = JSON.stringify(payload);
    // QR brutalist style - high contrast
    return await qrcode_1.default.toDataURL(json, {
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFE600' // canary yellow background like design
        },
        width: 400
    });
};
exports.generateQRCodeDataURL = generateQRCodeDataURL;
const isQRExpired = (payload) => {
    return (0, dayjs_1.default)().isAfter((0, dayjs_1.default)(payload.exp));
};
exports.isQRExpired = isQRExpired;
//# sourceMappingURL=qr.js.map