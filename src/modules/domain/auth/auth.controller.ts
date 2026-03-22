import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ApiResponse } from '../../../utils/ApiResponse';
import { ApiError } from '../../../utils/ApiError';
import { setAuthCookies, clearAuthCookies } from '../../../utils/cookie';
import * as authService from './auth.service';

// POST /api/v1/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        'Registration successful. Please check your email to verify your account.',
        { id: user._id, email: user.email }
      )
    );
});

// GET /api/v1/auth/verify-email/:token
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  await authService.verifyEmail(token);

  res.status(200).json(new ApiResponse(200, 'Email verified successfully. You can now log in.'));
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  // x-forwarded-for can be string | string[] — normalize it
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded ?? req.socket.remoteAddress ?? '');

  const { user, accessToken, refreshToken } = await authService.loginUser(req.body, ipAddress);

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(
    new ApiResponse(200, 'Login successful', {
      user,
      accessToken,
    })
  );
});

// POST /api/v1/auth/refresh
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (!rawRefreshToken) throw ApiError.unauthorized('No refresh token provided');

  const { accessToken, refreshToken } = await authService.refreshAccessToken(rawRefreshToken);

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(new ApiResponse(200, 'Token refreshed', { accessToken }));
});

// POST /api/v1/auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await authService.logoutUser(req.user._id.toString());
  }

  clearAuthCookies(res);

  res.status(200).json(new ApiResponse(200, 'Logged out successfully'));
});

// POST /api/v1/auth/forgot-password
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        'If an account with that email exists, a password reset link has been sent.'
      )
    );
});

// POST /api/v1/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  await authService.resetPassword(token, password);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        'Password reset successfully. You can now log in with your new password.'
      )
    );
});
