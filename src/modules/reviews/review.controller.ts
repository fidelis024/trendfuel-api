import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as reviewService from './review.service';

// POST /api/v1/reviews — buyer only
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const review = await reviewService.createReview(req.user._id.toString(), req.body);

  res.status(201).json(new ApiResponse(201, 'Review posted successfully', review));
});

// GET /api/v1/reviews/seller/:sellerId — public
export const getSellerReviews = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.params;
  const { reviews, summary, pagination } = await reviewService.getSellerReviews(
    sellerId as string,
    req.query as any
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, 'Seller reviews fetched successfully', { reviews, summary, pagination })
    );
});

// GET /api/v1/reviews/service/:serviceId — public
export const getServiceReviews = asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const { reviews, pagination } = await reviewService.getServiceReviews(
    serviceId as string,
    req.query as any
  );

  res
    .status(200)
    .json(new ApiResponse(200, 'Service reviews fetched successfully', { reviews, pagination }));
});

// GET /api/v1/reviews/order/:orderId — buyer (their own review)
export const getMyReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const review = await reviewService.getMyReview(
    req.params.orderId as string,
    req.user._id.toString()
  );

  res.status(200).json(new ApiResponse(200, 'Review fetched successfully', review));
});

// DELETE /api/v1/reviews/:id — buyer only, within 24h
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  await reviewService.deleteReview(req.params.id as string, req.user._id.toString());

  res.status(200).json(new ApiResponse(200, 'Review deleted successfully'));
});

// GET /api/v1/reviews/reviewable-orders — buyer only
export const getReviewableOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const orders = await reviewService.getReviewableOrders(req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Reviewable orders fetched successfully', orders));
});
