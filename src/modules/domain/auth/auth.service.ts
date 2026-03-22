import { User, UserRole } from '../../../schemas/mongoose/user.model';
import { ApiError } from '../../../utils/ApiError';
import {
  generateAccessToken,
  generateRefreshToken,
  generateCryptoToken,
  hashToken,
  verifyToken,
} from '../../../utils/generateToken';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../../utils/email';
import type { RegisterInput, LoginInput } from './auth.validator';

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerUser = async (data: RegisterInput) => {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // Generate email verification token
  const rawToken = generateCryptoToken();
  const hashedToken = hashToken(rawToken);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await User.create({
    email: data.email.toLowerCase(),
    passwordHash: data.password, // pre-save hook will hash this
    role: UserRole.BUYER,
    emailVerifyToken: hashedToken,
    emailVerifyExpires: expires,
  });

  // Send verification email (non-blocking on failure — don't crash registration)
  await sendVerificationEmail(user.email, rawToken);

  return user;
};

// ─── Verify Email ─────────────────────────────────────────────────────────────

export const verifyEmail = async (rawToken: string) => {
  const hashedToken = hashToken(rawToken);

  const user = await User.findOne({
    emailVerifyToken: hashedToken,
    emailVerifyExpires: { $gt: new Date() },
  }).select('+emailVerifyToken +emailVerifyExpires');

  if (!user) throw ApiError.badRequest('Verification link is invalid or has expired');
  if (user.emailVerified) throw ApiError.badRequest('Email is already verified');

  user.emailVerified = true;
  user.emailVerifyToken = null;
  user.emailVerifyExpires = null;
  await user.save();

  return user;
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginUser = async (data: LoginInput, ipAddress: string) => {
  // Explicitly select passwordHash since it's excluded by default
  const user = await User.findOne({ email: data.email.toLowerCase() }).select(
    '+passwordHash +refreshToken +refreshTokenExpires'
  );

  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const isMatch = await user.comparePassword(data.password);
  if (!isMatch) throw ApiError.unauthorized('Invalid email or password');

  if (!user.emailVerified)
    throw ApiError.forbidden('Please verify your email address before logging in');

  if (!user.isActive())
    throw ApiError.forbidden('Your account has been suspended. Please contact support');

  // Generate tokens
  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken = generateAccessToken(payload);
  const rawRefreshToken = generateCryptoToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);

  // Store hashed refresh token
  user.refreshToken = hashedRefreshToken;
  user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.lastLoginAt = new Date();
  user.ipAddress = ipAddress;
  await user.save();

  return { user, accessToken, refreshToken: rawRefreshToken };
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refreshAccessToken = async (rawRefreshToken: string) => {
  if (!rawRefreshToken) throw ApiError.unauthorized('No refresh token provided');

  const hashedToken = hashToken(rawRefreshToken);

  const user = await User.findOne({
    refreshToken: hashedToken,
    refreshTokenExpires: { $gt: new Date() },
  }).select('+refreshToken +refreshTokenExpires');

  if (!user) throw ApiError.unauthorized('Refresh token is invalid or has expired');
  if (!user.isActive()) throw ApiError.forbidden('Account is suspended');

  // Rotate refresh token on every use
  const payload = { userId: user._id.toString(), role: user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRawRefreshToken = generateCryptoToken();
  const newHashedRefreshToken = hashToken(newRawRefreshToken);

  user.refreshToken = newHashedRefreshToken;
  user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRawRefreshToken };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutUser = async (userId: string) => {
  await User.findByIdAndUpdate(userId, {
    refreshToken: null,
    refreshTokenExpires: null,
  });
};

// ─── Forgot Password ──────────────────────────────────────────────────────────

export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success to prevent email enumeration
  if (!user) return;

  const rawToken = generateCryptoToken();
  const hashedToken = hashToken(rawToken);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expires;
  await user.save();

  await sendPasswordResetEmail(user.email, rawToken);
};

// ─── Reset Password ───────────────────────────────────────────────────────────

export const resetPassword = async (rawToken: string, newPassword: string) => {
  const hashedToken = hashToken(rawToken);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');

  user.passwordHash = newPassword; // pre-save hook rehashes
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  // Invalidate all sessions on password reset
  user.refreshToken = null;
  user.refreshTokenExpires = null;
  await user.save();
};
