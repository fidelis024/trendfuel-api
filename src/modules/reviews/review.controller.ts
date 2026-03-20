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
  const reviews = await reviewService.getReviewsBySeller(req.params.sellerId);
  res.json(new ApiResponse(200, 'Reviews retrieved', reviews));
});
