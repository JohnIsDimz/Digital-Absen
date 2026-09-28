"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.defaultDB = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DB_PATH = path_1.default.join(__dirname, '../../data/database.json');
exports.defaultDB = {
    settings: null,
    kelas: [],
    guru: [],
    siswa: [],
    sesiAbsen: [],
    absensi: [],
    izin: [],
    rekapSikap: []
};
class JsonDB {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = this.load();
    }
    load() {
        try {
            if (fs_1.default.existsSync(this.filePath)) {
                const raw = fs_1.default.readFileSync(this.filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                // Migrate old DB without settings
                if (!parsed.settings && parsed.kelas !== undefined) {
                    return { settings: null, ...parsed };
                }
                return parsed;
            }
        }
        catch (e) {
            console.error('Gagal load DB, pakai default:', e);
        }
        const dir = path_1.default.dirname(this.filePath);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        this.save(exports.defaultDB);
        return exports.defaultDB;
    }
    save(data) {
        try {
            const dir = path_1.default.dirname(this.filePath);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
        }
        catch (e) {
            console.error('Gagal save DB:', e);
        }
    }
    get() {
        return this.data;
    }
    set(data) {
        this.data = data;
        this.save(data);
    }
    update(updater) {
        this.data = updater(this.data);
        this.save(this.data);
        return this.data;
    }
}
exports.db = new JsonDB(DB_PATH);
//# sourceMappingURL=db.js.map