/**
 * OCR KTP - Extract NIK 16 digit dari foto KTP
 * Pakai Tesseract.js (local OCR, tanpa API key, gratis)
 */
export interface OCRResult {
    success: boolean;
    text: string;
    nik?: string;
    allNIKs?: string[];
    confidence?: number;
    error?: string;
}
/**
 * Extract NIK 16 digit dari text hasil OCR
 * NIK biasanya ada di KTP dengan format 16 digit berurutan
 */
export declare function extractNIKFromText(text: string): {
    nik: string | null;
    allNIKs: string[];
};
/**
 * OCR Image file to text
 * @param imagePath - Path ke file image KTP
 */
export declare function ocrKTPImage(imagePath: string): Promise<OCRResult>;
/**
 * OCR dari buffer (untuk upload langsung)
 */
export declare function ocrKTPBuffer(buffer: Buffer): Promise<OCRResult>;
//# sourceMappingURL=ocr.d.ts.map