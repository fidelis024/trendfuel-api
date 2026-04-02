import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as serviceService from './service.service';

// POST /api/v1/services/categories — admin only
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await serviceService.createCategory(req.body);
  res.status(201).json(new ApiResponse(201, 'Category created successfully', category));
});

// GET /api/v1/services/categories
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.query as { platform?: string };
  const categories = await serviceService.getCategories(platform);
  res.status(200).json(new ApiResponse(200, 'Categories fetched successfully', categories));
});

// POST /api/v1/services — seller only
export const createService = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const service = await serviceService.createService(req.user._id.toString(), req.body);
  res.status(201).json(new ApiResponse(201, 'Service created successfully', service));
});

// GET /api/v1/services — public
export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const { services, pagination } = await serviceService.getServices(req.query as any);
  res
    .status(200)
    .json(new ApiResponse(200, 'Services fetched successfully', { services, pagination }));
});

// GET /api/v1/services/my — seller only
export const getMyServices = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const { services, pagination } = await serviceService.getMyServices(
    req.user._id.toString(),
    page,
    limit
  );

  res
    .status(200)
    .json(new ApiResponse(200, 'Your services fetched successfully', { services, pagination }));
});

// GET /api/v1/services/:id — public
export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.getServiceById(req.params.id as string);
  res.status(200).json(new ApiResponse(200, 'Service fetched successfully', service));
});

// PATCH /api/v1/services/:id — seller only (must own service)
export const updateService = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const service = await serviceService.updateService(
    req.params.id as string,
    req.user._id.toString(),
    req.body
  );

  res.status(200).json(new ApiResponse(200, 'Service updated successfully', service));
});

// DELETE /api/v1/services/:id — seller only (must own service)
export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  await serviceService.deleteService(req.params.id as string, req.user._id.toString());

  res.status(200).json(new ApiResponse(200, 'Service deleted successfully'));
});

// PATCH /api/v1/services/categories/:id — admin only
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await serviceService.updateCategory(req.params.id as string, req.body);
  res.status(200).json(new ApiResponse(200, 'Category updated successfully', category));
});

// DELETE /api/v1/services/categories/:id — admin only
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await serviceService.deleteCategory(req.params.id as string);
  res.status(200).json(new ApiResponse(200, 'Category deactivated successfully'));
});
