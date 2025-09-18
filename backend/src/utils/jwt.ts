const jwt = require('jsonwebtoken');

export const generateToken = (userId: number): string => {
  const payload = { userId };
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  return jwt.verify(token, secret);
};