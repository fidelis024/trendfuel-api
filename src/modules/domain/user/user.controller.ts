import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ApiResponse } from '../../../utils/ApiResponse';
import { ApiError } from '../../../utils/ApiError';
import { clearAuthCookies } from '../../../utils/cookie';
import * as userService from './user.service';

// GET /api/v1/users/me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const user = await userService.getMe(req.user._id.toString());

  res.status(200).json(new ApiResponse(200, 'Profile fetched successfully', user));
});

// PATCH /api/v1/users/me
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const user = await userService.updateProfile(req.user._id.toString(), req.body);

  res.status(200).json(new ApiResponse(200, 'Profile updated successfully', user));
});

// PATCH /api/v1/users/me/change-password
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  await userService.changePassword(req.user._id.toString(), req.body);

  // Clear cookies — user must log in again with new password
  clearAuthCookies(res);

  res.status(200).json(new ApiResponse(200, 'Password changed successfully. Please log in again.'));
});

// GET /api/v1/users/seller/:sellerId
export const getSellerProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const data = await userService.getSellerProfile(
    req.params.sellerId as string,
    req.user._id.toString(),
    req.user.role
  );
  res.status(200).json(new ApiResponse(200, 'Seller profile fetched successfully', data));
});

// DELETE /api/v1/users/me
export const deactivateAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const { password } = req.body;
  if (!password) throw ApiError.badRequest('Password is required to deactivate your account');

  await userService.deactivateAccount(req.user._id.toString(), password);

  clearAuthCookies(res);

  res.status(200).json(new ApiResponse(200, 'Account deactivated successfully'));
});
