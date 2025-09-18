import jwt, { SignOptions } from 'jsonwebtoken';

export const generateToken = (userId: number): string => {
  const payload = { userId };
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  const options: SignOptions = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };

  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
};