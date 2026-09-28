/**
 * Hitung jarak antara 2 koordinat menggunakan Haversine formula
 * Return jarak dalam meter
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const isWithinGeofence = (
  userLat: number,
  userLng: number,
  schoolLat: number,
  schoolLng: number,
  radiusMeters: number
): { distance: number; inside: boolean } => {
  const distance = calculateDistance(userLat, userLng, schoolLat, schoolLng);
  return {
    distance: Math.round(distance),
    inside: distance <= radiusMeters
  };
};

export const getJamStatus = (jamCheckin: string, batasToleransi: string): { status: 'HADIR' | 'TERLAMBAT'; terlambatMenit: number } => {
  // jam format HH:mm or HH:mm:ss
  const parse = (t: string) => {
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
