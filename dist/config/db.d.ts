import { Kelas, Guru, Siswa, SesiAbsen, Absensi, PengajuanIzin, RekapSikap } from '../types';
export interface Settings {
    id: string;
    sekolahNama: string;
    sekolahAlamat: string;
    lat: number;
    lng: number;
    radiusMeter: number;
    tahunAjaran: string;
    semester: 'GANJIL' | 'GENAP';
    jamMasuk: string;
    batasToleransi: string;
    updatedAt: string;
    updatedBy?: string;
}
export interface Database {
    settings: Settings | null;
    kelas: Kelas[];
    guru: Guru[];
    siswa: Siswa[];
    sesiAbsen: SesiAbsen[];
    absensi: Absensi[];
    izin: PengajuanIzin[];
    rekapSikap: RekapSikap[];
}
export declare const defaultDB: Database;
declare class JsonDB {
    private data;
    private filePath;
    constructor(filePath: string);
    private load;
    private save;
    get(): Database;
    set(data: Database): void;
    update(updater: (data: Database) => Database): Database;
}
export declare const db: JsonDB;
export {};
//# sourceMappingURL=db.d.ts.map