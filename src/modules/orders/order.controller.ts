import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as orderService from './order.service';

// POST /api/v1/orders
export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const order = await orderService.placeOrder(req.user._id.toString(), req.body);

  res.status(201).json(new ApiResponse(201, 'Order placed successfully', order));
});

// GET /api/v1/orders
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const { orders, pagination } = await orderService.getOrders(
    req.user._id.toString(),
    req.user.role,
    req.query as any
  );

  res.status(200).json(new ApiResponse(200, 'Orders fetched successfully', orders, pagination));
});

// GET /api/v1/orders/:id
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const order = await orderService.getOrderById(
    req.params.id,
    req.user._id.toString(),
    req.user.role
  );

  res.status(200).json(new ApiResponse(200, 'Order fetched successfully', order));
});

// PATCH /api/v1/orders/:id/deliver
export const deliverOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const order = await orderService.deliverOrder(
    req.params.id,
    req.user._id.toString(),
    req.body.deliveryLink
  );

  res.status(200).json(new ApiResponse(200, 'Order marked as delivered', order));
});

// PATCH /api/v1/orders/:id/complete
export const completeOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const order = await orderService.completeOrder(req.params.id, req.user._id.toString());

  res.status(200).json(new ApiResponse(200, 'Order completed. Payment released to seller.', order));
});

// PATCH /api/v1/orders/:id/cancel
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const order = await orderService.cancelOrder(
    req.params.id,
    req.user._id.toString(),
    req.user.role
  );

  res.status(200).json(new ApiResponse(200, 'Order cancelled and refunded', order));
});
