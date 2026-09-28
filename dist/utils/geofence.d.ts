/**
 * Hitung jarak antara 2 koordinat menggunakan Haversine formula
 * Return jarak dalam meter
 */
export declare const calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
export declare const isWithinGeofence: (userLat: number, userLng: number, schoolLat: number, schoolLng: number, radiusMeters: number) => {
    distance: number;
    inside: boolean;
};
export declare const getJamStatus: (jamCheckin: string, batasToleransi: string) => {
    status: "HADIR" | "TERLAMBAT";
    terlambatMenit: number;
};
//# sourceMappingURL=geofence.d.ts.map