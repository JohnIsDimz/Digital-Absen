import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/jwt';

let io: SocketIOServer;

export const initSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
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
      (socket as any).user = null;
      return next();
    }
    try {
      const decoded = verifyToken(token);
      (socket as any).user = decoded;
      next();
    } catch (e) {
      (socket as any).user = null;
      next(); // allow but as guest, will be checked per event
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    console.log(`🔌 Socket connected: ${socket.id} - Role: ${user?.role || 'GUEST'} - ${user?.id || 'no-id'}`);

    // Join room by kelasId for real-time class updates
    socket.on('join:kelas', (kelasId: string) => {
      socket.join(`kelas:${kelasId}`);
      console.log(`👥 ${socket.id} joined kelas:${kelasId}`);
      socket.emit('joined:kelas', { kelasId, message: `Masuk room kelas ${kelasId}` });
    });

    socket.on('join:guru', (guruId: string) => {
      socket.join(`guru:${guruId}`);
      socket.join('role:guru');
      console.log(`👨‍🏫 Guru ${guruId} joined guru room`);
    });

    socket.on('join:siswa', (siswaId: string) => {
      socket.join(`siswa:${siswaId}`);
      socket.join('role:siswa');
      console.log(`🧑‍🎓 Siswa ${siswaId} joined`);
    });

    // Real-time GPS ping from siswa
    socket.on('siswa:gps', (data: { lat: number; lng: number; kelasId: string }) => {
      // Broadcast to guru in same kelas
      socket.to(`kelas:${data.kelasId}`).emit('guru:siswa-gps', {
        siswaId: user?.id,
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date().toISOString()
      });
    });

    // QR refresh event from guru
    socket.on('guru:qr-refresh', (data: { kelasId: string; qrToken: string; dataURL: string }) => {
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

export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

// Helper emit functions for controllers
export const emitAbsensiBaru = (kelasId: string, absensi: any, siswa: any) => {
  try {
    const io = getIO();
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
  } catch (e) {
    console.error('Gagal emit absensi baru:', e);
  }
};

export const emitIzinBaru = (kelasId: string, izin: any, siswa: any) => {
  try {
    const io = getIO();
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
  } catch (e) {
    console.error('Gagal emit izin baru:', e);
  }
};

export const emitIzinApproved = (siswaId: string, izin: any) => {
  try {
    const io = getIO();
    io.to(`siswa:${siswaId}`).emit('izin:approved', {
      izin,
      message: `Izin kamu ${izin.status}`
    });
  } catch (e) {
    console.error('Gagal emit izin approved:', e);
  }
};
