import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface User {
      _id: string;
      email: string;
      role: 'user' | 'seller' | 'admin';
      verified: boolean;
    }
  }
}

export interface CustomRequest extends Request {
  user?: Express.User;
}

export type AsyncHandler = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => Promise<void | any>;
