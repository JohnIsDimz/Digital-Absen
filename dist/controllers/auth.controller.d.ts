import { Request, Response } from 'express';
export declare const joinSiswa: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const loginGuru: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const registerGuru: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const resetGuruPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMe: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.controller.d.ts.map