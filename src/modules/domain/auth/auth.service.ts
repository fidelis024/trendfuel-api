import jwt from 'jsonwebtoken';
import User, { IUser } from '../../../schemas/mongoose/user.model';
import userService from '../user/user.service';
import { RegisterInput, LoginInput } from '../../../schemas/zod/user.schema';
import { ApiError } from '../../../utils/ApiError';
import env from '../../../config/env';
import logger from '../../../utils/logger';

export class AuthService {
  private generateToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_SECRET as jwt.Secret, {
      expiresIn: env.JWT_EXPIRE as jwt.SignOptions['expiresIn'],
    });
  }

  async register(data: RegisterInput): Promise<{ user: IUser; token: string }> {
    const user = await userService.createUser(data);
    const token = this.generateToken(user._id.toString());
    logger.info(`User registered: ${user._id}`);
    return { user, token };
  }

  async login(data: LoginInput): Promise<{ user: IUser; token: string }> {
    const user = await userService.getUserByEmail(data.email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = this.generateToken(user._id.toString());
    logger.info(`User logged in: ${user._id}`);
    return { user, token };
  }

  async verifyToken(token: string): Promise<IUser> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      const user = await userService.getUserById(decoded.userId);
      return user;
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired token');
    }
  }
}

export default new AuthService();
