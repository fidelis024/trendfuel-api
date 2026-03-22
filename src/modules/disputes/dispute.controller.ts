import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as disputeService from './dispute.service';

// POST /api/v1/disputes — buyer only
export const openDispute = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const dispute = await disputeService.openDispute(req.user._id.toString(), req.body);

  res.status(201).json(new ApiResponse(201, 'Dispute opened successfully', dispute));
});

// PATCH /api/v1/disputes/:id/respond — seller only
export const sellerRespond = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const dispute = await disputeService.sellerRespond(
    req.params.id,
    req.user._id.toString(),
    req.body
  );

  res.status(200).json(new ApiResponse(200, 'Response submitted successfully', dispute));
});

// POST /api/v1/disputes/:id/evidence — buyer or seller
export const uploadEvidence = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const role = req.user.role === 'buyer' ? 'buyer' : 'seller';

  const evidence = await disputeService.uploadEvidence(
    req.params.id,
    req.user._id.toString(),
    role,
    req.file
  );

  res.status(201).json(new ApiResponse(201, 'Evidence uploaded successfully', evidence));
});

// GET /api/v1/disputes — buyer/seller/admin
export const getDisputes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const { disputes, pagination } = await disputeService.getDisputes(
    req.user._id.toString(),
    req.user.role,
    req.query as any
  );

  res.status(200).json(new ApiResponse(200, 'Disputes fetched successfully', disputes, pagination));
});

// GET /api/v1/disputes/:id — buyer/seller/admin
export const getDisputeById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const { dispute, evidence } = await disputeService.getDisputeById(
    req.params.id,
    req.user._id.toString(),
    req.user.role
  );

  res.status(200).json(new ApiResponse(200, 'Dispute fetched successfully', { dispute, evidence }));
});

// PATCH /api/v1/disputes/:id/resolve — admin only
export const resolveDispute = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const dispute = await disputeService.resolveDispute(
    req.params.id,
    req.user._id.toString(),
    req.body
  );

  res.status(200).json(new ApiResponse(200, 'Dispute resolved successfully', dispute));
});
