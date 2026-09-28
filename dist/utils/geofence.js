"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJamStatus = exports.isWithinGeofence = exports.calculateDistance = void 0;
/**
 * Hitung jarak antara 2 koordinat menggunakan Haversine formula
 * Return jarak dalam meter
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
exports.calculateDistance = calculateDistance;
const isWithinGeofence = (userLat, userLng, schoolLat, schoolLng, radiusMeters) => {
    const distance = (0, exports.calculateDistance)(userLat, userLng, schoolLat, schoolLng);
    return {
        distance: Math.round(distance),
        inside: distance <= radiusMeters
    };
};
exports.isWithinGeofence = isWithinGeofence;
const getJamStatus = (jamCheckin, batasToleransi) => {
    // jam format HH:mm or HH:mm:ss
    const parse = (t) => {
        const parts = t.split(':').map(Number);
        return parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
    };
    const checkin = parse(jamCheckin);
    const batas = parse(batasToleransi);
    if (checkin <= batas) {
        return { status: 'HADIR', terlambatMenit: 0 };
    }
    return { status: 'TERLAMBAT', terlambatMenit: Math.round(checkin - batas) };
};
exports.getJamStatus = getJamStatus;
//# sourceMappingURL=geofence.js.map