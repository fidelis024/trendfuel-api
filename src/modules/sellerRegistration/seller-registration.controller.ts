import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import * as SellerRegistrationService from './seller-registration.service';
import { ApiError } from '../../utils/ApiError';

export const paySellerFee = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await SellerRegistrationService.paySellerFee(req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Seller registration fee paid successfully', result));
});

export const submitKYC = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await SellerRegistrationService.submitKYC(req.user._id.toString(), req.body);
  res.status(200).json(new ApiResponse(200, 'KYC submitted successfully', result));
});

export const getRegistrationStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await SellerRegistrationService.getRegistrationStatus(req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Registration status fetched successfully', result));
});
