"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('🔥 Error:', err);
    const status = err.status || 500;
    const message = err.message || 'Terjadi kesalahan internal server';
    res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
        code: 'NOT_FOUND'
    });
};
exports.notFound = notFound;
//# sourceMappingURL=errorHandler.js.map