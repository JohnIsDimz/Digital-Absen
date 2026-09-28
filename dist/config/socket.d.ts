import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
export declare const initSocket: (httpServer: HTTPServer) => SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getIO: () => SocketIOServer;
export declare const emitAbsensiBaru: (kelasId: string, absensi: any, siswa: any) => void;
export declare const emitIzinBaru: (kelasId: string, izin: any, siswa: any) => void;
export declare const emitIzinApproved: (siswaId: string, izin: any) => void;
//# sourceMappingURL=socket.d.ts.map