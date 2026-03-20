import { Response } from 'express';
import { CustomRequest } from '../../../types';
import { asyncHandler } from '../../../utils/asyncHandler';
import userService from './user.service';
import { ApiResponse } from '../../../utils/ApiResponse';

export const getProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
  const user = await userService.getUserById(req.user!._id);
  res.json(new ApiResponse(200, 'Profile retrieved', user));
});

export const updateProfile = asyncHandler(async (req: CustomRequest, res: Response) => {
  const user = await userService.updateUserProfile(req.user!._id, req.body);
  res.json(new ApiResponse(200, 'Profile updated', user));
});

export const deleteAccount = asyncHandler(async (req: CustomRequest, res: Response) => {
  await userService.deleteUser(req.user!._id);
  res.json(new ApiResponse(200, 'Account deleted successfully'));
});
