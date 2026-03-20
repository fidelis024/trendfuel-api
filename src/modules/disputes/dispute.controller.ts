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
  const disputeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const resolution = String(req.body.resolution);
  const dispute = await disputeService.resolveDispute(disputeId, resolution);
  res.json(new ApiResponse(200, 'Dispute resolved', dispute));
});
