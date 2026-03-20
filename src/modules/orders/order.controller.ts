// orders/order.controller.ts
import { Response } from 'express';
import { CustomRequest } from '../../types';
import { asyncHandler } from '../../utils/asyncHandler';
import orderService from './order.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const createOrder = asyncHandler(async (req: CustomRequest, res: Response) => {
  const order = await orderService.createOrder(req.body);
  res.status(201).json(new ApiResponse(201, 'Order created', order));
});

export const getOrder = asyncHandler(async (req: CustomRequest, res: Response) => {
  const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const order = await orderService.getOrder(orderId);
  res.json(new ApiResponse(200, 'Order retrieved', order));
});
