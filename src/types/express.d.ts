import { IUser } from '../schemas/mongoose/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};