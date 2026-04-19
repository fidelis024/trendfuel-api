import { SellerKYC } from '../../../schemas/mongoose/sellerKyc.model';
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

// ─── Get Seller Public Profile ────────────────────────────────────────────────

export const getSellerProfile = async (
  sellerId: string,
  requesterId: string,
  requesterRole: string
) => {
  const seller = await User.findOne({
    _id: sellerId,
    role: 'seller',
  }).select('firstName lastName email sellerProfile sellerMetrics createdAt');

  if (!seller) throw ApiError.notFound('Seller not found');

  // Base public profile
  const profile: Record<string, any> = {
    _id: seller._id,
    firstName: seller.firstName,
    lastName: seller.lastName,
    sellerProfile: {
      bio: seller.sellerProfile?.bio,
      country: seller.sellerProfile?.country,
      niche: seller.sellerProfile?.niche,
      level: seller.sellerProfile?.level,
      badge: seller.sellerProfile?.badge,
    },
    sellerMetrics: seller.sellerMetrics,
    memberSince: seller.createdAt,
  };

  // KYC only visible to the seller themselves or admin
  const isSelf = requesterId === sellerId;
  const isAdmin = requesterRole === 'admin' || requesterRole === 'super_admin';

  if (isSelf || isAdmin) {
    const kyc = await SellerKYC.findOne({ userId: sellerId }).select(
      'fullName nin dateOfBirth phone streetAddress city state status rejectionReason createdAt reviewedAt'
    );
    profile.kyc = kyc ?? null;
  }

  return profile;
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
