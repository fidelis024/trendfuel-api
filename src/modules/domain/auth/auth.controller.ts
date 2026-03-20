import { Response } from 'express';
import { CustomRequest } from '../../../types';
import { asyncHandler } from '../../../utils/asyncHandler';
import authService from './auth.service';
import { ApiResponse } from '../../../utils/ApiResponse';
import { registerSchema, loginSchema } from '../user/user.validator';

export const register = asyncHandler(async (req: CustomRequest, res: Response) => {
  const data = registerSchema.parse(req.body);
  const { user, token } = await authService.register(data);
  res.status(201).json(new ApiResponse(201, 'Registration successful', { user, token }));
});

export const login = asyncHandler(async (req: CustomRequest, res: Response) => {
  const data = loginSchema.parse(req.body);
  const { user, token } = await authService.login(data);
  res.json(new ApiResponse(200, 'Login successful', { user, token }));
});

export const logout = asyncHandler(async (req: CustomRequest, res: Response) => {
  res.json(new ApiResponse(200, 'Logout successful'));
});
