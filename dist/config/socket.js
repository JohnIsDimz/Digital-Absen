"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitIzinApproved = exports.emitIzinBaru = exports.emitAbsensiBaru = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jwt_1 = require("../utils/jwt");
let io;
const initSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
    // Auth middleware for socket
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        if (!token) {
            // Allow guest for public QR display, but mark as guest
            socket.user = null;
            return next();
        }
        try {
            const decoded = (0, jwt_1.verifyToken)(token);
            socket.user = decoded;
            next();
        }
        catch (e) {
            socket.user = null;
            next(); // allow but as guest, will be checked per event
        }
    });
    io.on('connection', (socket) => {
        const user = socket.user;
        console.log(`🔌 Socket connected: ${socket.id} - Role: ${user?.role || 'GUEST'} - ${user?.id || 'no-id'}`);
        // Join room by kelasId for real-time class updates
        socket.on('join:kelas', (kelasId) => {
            socket.join(`kelas:${kelasId}`);
            console.log(`👥 ${socket.id} joined kelas:${kelasId}`);
            socket.emit('joined:kelas', { kelasId, message: `Masuk room kelas ${kelasId}` });
        });
        socket.on('join:guru', (guruId) => {
            socket.join(`guru:${guruId}`);
            socket.join('role:guru');
            console.log(`👨‍🏫 Guru ${guruId} joined guru room`);
        });
        socket.on('join:siswa', (siswaId) => {
            socket.join(`siswa:${siswaId}`);
            socket.join('role:siswa');
            console.log(`🧑‍🎓 Siswa ${siswaId} joined`);
        });
        // Real-time GPS ping from siswa
        socket.on('siswa:gps', (data) => {
            // Broadcast to guru in same kelas
            socket.to(`kelas:${data.kelasId}`).emit('guru:siswa-gps', {
                siswaId: user?.id,
                lat: data.lat,
                lng: data.lng,
                timestamp: new Date().toISOString()
            });
        });
        // QR refresh event from guru
        socket.on('guru:qr-refresh', (data) => {
            io.to(`kelas:${data.kelasId}`).emit('siswa:qr-update', {
                qrToken: data.qrToken,
                dataURL: data.dataURL,
                timestamp: new Date().toISOString()
            });
            console.log(`🔄 QR refreshed for kelas ${data.kelasId}`);
        });
        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io)
        throw new Error('Socket.IO not initialized');
    return io;
};
exports.getIO = getIO;
// Helper emit functions for controllers
const emitAbsensiBaru = (kelasId, absensi, siswa) => {
    try {
        const io = (0, exports.getIO)();
        io.to(`kelas:${kelasId}`).emit('absensi:baru', {
            absensi,
            siswa,
            timestamp: new Date().toISOString(),
            message: `${siswa.nama} baru saja absen - ${absensi.status}`
        });
        io.to('role:guru').emit('dashboard:update', {
            type: 'ABSENSI_BARU',
            kelasId,
            absensi,
            siswa
        });
        console.log(`📡 Real-time: absensi baru ${siswa.nama} -> kelas:${kelasId}`);
    }
    catch (e) {
        console.error('Gagal emit absensi baru:', e);
    }
};
exports.emitAbsensiBaru = emitAbsensiBaru;
const emitIzinBaru = (kelasId, izin, siswa) => {
    try {
        const io = (0, exports.getIO)();
        io.to(`kelas:${kelasId}`).emit('izin:baru', {
            izin,
            siswa,
            timestamp: new Date().toISOString()
        });
        io.to('role:guru').emit('dashboard:update', {
            type: 'IZIN_BARU',
            kelasId,
            izin,
            siswa
        });
    }
    catch (e) {
        console.error('Gagal emit izin baru:', e);
    }
};
exports.emitIzinBaru = emitIzinBaru;
const emitIzinApproved = (siswaId, izin) => {
    try {
        const io = (0, exports.getIO)();
        io.to(`siswa:${siswaId}`).emit('izin:approved', {
            izin,
            message: `Izin kamu ${izin.status}`
        });
    }
    catch (e) {
        console.error('Gagal emit izin approved:', e);
    }
};
exports.emitIzinApproved = emitIzinApproved;
//# sourceMappingURL=socket.js.map