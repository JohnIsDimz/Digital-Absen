"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNIKFromText = extractNIKFromText;
exports.ocrKTPImage = ocrKTPImage;
exports.ocrKTPBuffer = ocrKTPBuffer;
const tesseract_js_1 = require("tesseract.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Extract NIK 16 digit dari text hasil OCR
 * NIK biasanya ada di KTP dengan format 16 digit berurutan
 */
function extractNIKFromText(text) {
    // Bersihkan text dari karakter aneh, keep digits and spaces
    const cleanText = text.replace(/[^\d\s]/g, ' ');
    // Cari semua 16 digit berurutan (NIK)
    const nikRegex = /\b\d{16}\b/g;
    const matches = cleanText.match(nikRegex) || [];
    // Filter NIK yang valid (tidak semua 0, dll)
    const validNIKs = matches.filter(nik => {
        if (nik === '0000000000000000')
            return false;
        if (/^(\d)\1{15}$/.test(nik))
            return false; // semua digit sama
        return true;
    });
    // Jika ada multiple, ambil yang paling mungkin (biasanya NIK pertama yang valid)
    // Validasi tambahan dengan validateNIK
    const { validateNIK } = require('./nik');
    let bestNIK = null;
    for (const nik of validNIKs) {
        const result = validateNIK(nik);
        if (result.valid) {
            bestNIK = nik;
            break;
        }
    }
    // Jika tidak ada yang valid, ambil yang pertama
    if (!bestNIK && validNIKs.length > 0) {
        bestNIK = validNIKs[0];
    }
    return {
        nik: bestNIK,
        allNIKs: validNIKs,
    };
}
/**
 * OCR Image file to text
 * @param imagePath - Path ke file image KTP
 */
async function ocrKTPImage(imagePath) {
    let worker = null;
    try {
        // Cek file exists
        if (!fs_1.default.existsSync(imagePath)) {
            return { success: false, text: '', error: 'File tidak ditemukan' };
        }
        // Create worker untuk bahasa Indonesia + English
        worker = await (0, tesseract_js_1.createWorker)('ind+eng', 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            },
        });
        // Recognize text dari image
        const { data } = await worker.recognize(imagePath);
        const text = data.text || '';
        const confidence = data.confidence || 0;
        console.log(`OCR Text: ${text.substring(0, 200)}...`);
        console.log(`Confidence: ${confidence}%`);
        // Extract NIK dari text
        const { nik, allNIKs } = extractNIKFromText(text);
        await worker.terminate();
        return {
            success: true,
            text,
            nik: nik || undefined,
            allNIKs,
            confidence,
        };
    }
    catch (err) {
        console.error('OCR Error:', err);
        if (worker) {
            try {
                await worker.terminate();
            }
            catch { }
        }
        return {
            success: false,
            text: '',
            error: err.message || 'Gagal OCR',
        };
    }
}
/**
 * OCR dari buffer (untuk upload langsung)
 */
async function ocrKTPBuffer(buffer) {
    const tempPath = path_1.default.join(__dirname, '../../uploads/temp-ocr-' + Date.now() + '.jpg');
    try {
        // Simpan buffer ke temp file
        fs_1.default.writeFileSync(tempPath, buffer);
        const result = await ocrKTPImage(tempPath);
        // Hapus temp file
        try {
            fs_1.default.unlinkSync(tempPath);
        }
        catch { }
        return result;
    }
    catch (err) {
        try {
            fs_1.default.unlinkSync(tempPath);
        }
        catch { }
        return { success: false, text: '', error: err.message };
    }
}
//# sourceMappingURL=ocr.js.map