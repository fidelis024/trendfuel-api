// reviews/review.controller.ts
import { Response } from 'express';
import { CustomRequest } from '../../types';
import { asyncHandler } from '../../utils/asyncHandler';
import reviewService from './review.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const createReview = asyncHandler(async (req: CustomRequest, res: Response) => {
  const review = await reviewService.createReview(req.body);
  res.status(201).json(new ApiResponse(201, 'Review created', review));
});

export const getSellerReviews = asyncHandler(async (req: CustomRequest, res: Response) => {
  const sellerId = Array.isArray(req.params.sellerId)
    ? req.params.sellerId[0]
    : req.params.sellerId;
  const reviews = await reviewService.getReviewsBySeller(sellerId);
  res.json(new ApiResponse(200, 'Reviews retrieved', reviews));
});
