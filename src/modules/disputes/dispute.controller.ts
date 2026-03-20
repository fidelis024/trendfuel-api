// disputes/dispute.controller.ts
import { Response } from 'express';
import { CustomRequest } from '../../types';
import { asyncHandler } from '../../utils/asyncHandler';
import disputeService from './dispute.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const createDispute = asyncHandler(async (req: CustomRequest, res: Response) => {
  const dispute = await disputeService.createDispute(req.body);
  res.status(201).json(new ApiResponse(201, 'Dispute created', dispute));
});

export const resolveDispute = asyncHandler(async (req: CustomRequest, res: Response) => {
  const dispute = await disputeService.resolveDispute(req.params.id, req.body.resolution);
  res.json(new ApiResponse(200, 'Dispute resolved', dispute));
});
