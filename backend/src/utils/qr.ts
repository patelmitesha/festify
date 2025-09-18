import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export const generateQRCode = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

export const generateCouponId = (): string => {
  return uuidv4();
};