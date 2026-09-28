export interface QRPayload {
    sesiId: string;
    kelasId: string;
    token: string;
    tanggal: string;
    exp: string;
    lat: number;
    lng: number;
}
export declare const generateQRToken: () => string;
export declare const generateQRPayload: (data: Omit<QRPayload, "token" | "exp"> & {
    expirySeconds: number;
}) => QRPayload;
export declare const generateQRCodeDataURL: (payload: QRPayload) => Promise<string>;
export declare const isQRExpired: (payload: QRPayload) => boolean;
//# sourceMappingURL=qr.d.ts.map