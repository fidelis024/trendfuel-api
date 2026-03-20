import User, { IUser } from './user.model';
import { RegisterInput, UpdateProfileInput } from './user.validator';
import { ApiError } from '../../../utils/ApiError';
import logger from '../../../utils/logger';

export class UserService {
  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  async createUser(data: RegisterInput): Promise<IUser> {
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new ApiError(400, 'Email already in use');
    }

    const user = new User({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role,
    });

    await user.save();
    logger.info(`User created: ${user._id}`);
    return user;
  }

  async updateUserProfile(userId: string, data: UpdateProfileInput): Promise<IUser> {
    const user = await User.findByIdAndUpdate(userId, data, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    logger.info(`User profile updated: ${userId}`);
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    const result = await User.findByIdAndDelete(userId);
    if (!result) {
      throw new ApiError(404, 'User not found');
    }
    logger.info(`User deleted: ${userId}`);
  }
}

export default new UserService();
