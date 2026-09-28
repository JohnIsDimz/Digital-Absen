/**
 * Supabase DB Adapter - Drop-in replacement untuk JsonDB
 * Biar bisa pakai Supabase di Vercel tanpa ubah controllers banyak!
 *
 * Jika SUPABASE_URL di-set, pakai Supabase. Jika tidak, fallback ke JSON.
 */
import { Database } from './db';
declare class SupabaseDB {
    private jsonData;
    private loadJson;
    private saveJson;
    get(): Promise<Database>;
    set(data: Database): Promise<void>;
    update(updater: (data: Database) => Database): Promise<Database>;
}
export declare const supabaseDB: SupabaseDB;
export {};
//# sourceMappingURL=db.supabase.d.ts.map