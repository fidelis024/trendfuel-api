// utils/generateToken.ts
import jwt from 'jsonwebtoken';
import env from '../config/env';

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_SECRET as jwt.Secret, {
    expiresIn: env.JWT_EXPIRE as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, env.JWT_SECRET);
};

export default generateToken;
