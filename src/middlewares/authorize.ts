import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const userRole = (req.user as any).role;
    if (!roles.includes(userRole)) {
      throw new ApiError(403, 'Forbidden - Insufficient permissions');
    }

    next();
  };
};

export default authorize;
