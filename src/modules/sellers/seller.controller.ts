// sellers/seller.controller.ts
import { Response } from 'express';
import { CustomRequest } from '../../types';
import { asyncHandler } from '../../utils/asyncHandler';
import sellerService from './seller.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const getSeller = asyncHandler(async (req: CustomRequest, res: Response) => {
  const seller = await sellerService.getSellerByUserId(req.user!._id);
  res.json(new ApiResponse(200, 'Seller retrieved', seller));
});
