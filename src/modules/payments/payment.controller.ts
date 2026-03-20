// payments/payment.controller.ts
import { Response } from 'express';
import { CustomRequest } from '../../types';
import { asyncHandler } from '../../utils/asyncHandler';
import paymentService from './payment.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const initiatePayment = asyncHandler(async (req: CustomRequest, res: Response) => {
  const payment = await paymentService.createPayment(req.body);
  res.json(new ApiResponse(200, 'Payment initiated', payment));
});
