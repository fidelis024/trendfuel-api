import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { ApiError } from '../utils/ApiError';

export const authenticate = passport.authenticate('jwt', { session: false });

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized - Please login');
  }
  next();
};

export default authenticate;
