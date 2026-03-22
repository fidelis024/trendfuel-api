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

    // IUser extends Document so this assignment is safe
    req.user = user as unknown as Express.Request['user'];
    next();
  }
);

export const authorize = (...roles: string[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  });