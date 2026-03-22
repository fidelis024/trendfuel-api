import { User, UserStatus } from '../../../schemas/mongoose/user.model';
import { ApiError } from '../../../utils/ApiError';
import type { UpdateProfileInput, ChangePasswordInput } from './user.validator';

// ─── Get Me ───────────────────────────────────────────────────────────────────

export const getMe = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

// ─── Update Profile ───────────────────────────────────────────────────────────

export const updateProfile = async (userId: string, data: UpdateProfileInput) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (data.firstName) user.firstName = data.firstName;
  if (data.lastName) user.lastName = data.lastName;

  await user.save();
  return user;
};

// ─── Change Password ──────────────────────────────────────────────────────────

export const changePassword = async (userId: string, data: ChangePasswordInput) => {
  // Explicitly select passwordHash since it's excluded by default
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  const isMatch = await user.comparePassword(data.currentPassword);
  if (!isMatch) throw ApiError.badRequest('Current password is incorrect');

  user.passwordHash = data.newPassword; // pre-save hook rehashes
  // Invalidate all existing sessions on password change
  user.refreshToken = null;
  user.refreshTokenExpires = null;
  await user.save();
};

// ─── Deactivate Account ───────────────────────────────────────────────────────

export const deactivateAccount = async (userId: string, password: string) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.badRequest('Password is incorrect');

  user.status = UserStatus.SUSPENDED;
  user.refreshToken = null;
  user.refreshTokenExpires = null;
  await user.save();
};