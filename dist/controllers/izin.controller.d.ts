import { Response } from 'express';
export declare const ajukanIzin: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMyIzin: (req: any, res: Response) => Promise<void>;
export declare const getPendingIzin: (req: any, res: Response) => Promise<void>;
export declare const approveIzin: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllIzin: (req: any, res: Response) => Promise<void>;
//# sourceMappingURL=izin.controller.d.ts.map