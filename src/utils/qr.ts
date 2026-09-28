import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

export interface QRPayload {
  sesiId: string;
  kelasId: string;
  token: string;
  tanggal: string;
  exp: string; // ISO expiry
  lat: number;
  lng: number;
}

export const generateQRToken = (): string => uuidv4();

export const generateQRPayload = (data: Omit<QRPayload, 'token' | 'exp'> & { expirySeconds: number }): QRPayload => {
  const token = generateQRToken();
  const exp = dayjs().add(data.expirySeconds, 'second').toISOString();
  return {
    sesiId: data.sesiId,
    kelasId: data.kelasId,
    token,
    tanggal: data.tanggal,
    exp,
    lat: data.lat,
    lng: data.lng
  };
};

export const generateQRCodeDataURL = async (payload: QRPayload): Promise<string> => {
  const json = JSON.stringify(payload);
  // QR brutalist style - high contrast
  return await QRCode.toDataURL(json, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFE600' // canary yellow background like design
    },
    width: 400
  });
};

export const isQRExpired = (payload: QRPayload): boolean => {
  return dayjs().isAfter(dayjs(payload.exp));
};
