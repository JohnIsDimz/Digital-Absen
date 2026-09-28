import { Response } from 'express';
export declare const generateQRSession: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getActiveQR: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const lockSession: (req: any, res: Response) => Promise<void>;
//# sourceMappingURL=qr.controller.d.ts.map