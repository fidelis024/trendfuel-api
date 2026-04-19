import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as dashboardService from './dashboard.service';

// GET /api/v1/dashboard/buyer
export const getBuyerDashboard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const data = await dashboardService.getBuyerDashboard(req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Buyer dashboard fetched successfully', data));
});

// GET /api/v1/dashboard/seller
export const getSellerDashboard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const data = await dashboardService.getSellerDashboard(req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Seller dashboard fetched successfully', data));
});
