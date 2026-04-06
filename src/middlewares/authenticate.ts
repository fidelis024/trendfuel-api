import { Request, Response, NextFunction } from 'express';
import { User } from '../schemas/mongoose/user.model';
import { verifyToken } from '../utils/generateToken';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token: string | undefined =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined);

    if (!token) throw ApiError.unauthorized('Authentication required');

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId);
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (!user.isActive()) throw ApiError.forbidden('Account is suspended');

    req.user = user as unknown as Express.Request['user'];
    next();
  }
);

// super_admin bypasses all role checks automatically
export const authorize = (...roles: string[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if ((req.user.role as string) === 'super_admin') return next();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  });

// Middleware specifically for super_admin only routes
export const superAdminOnly = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if ((req.user.role as string) !== 'super_admin') {
      throw ApiError.forbidden('This action requires super admin privileges');
    }
    next();
  }
);
