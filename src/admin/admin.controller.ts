import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import * as adminService from './admin.service';

// ─── Users ────────────────────────────────────────────────────────────────────

// GET /api/v1/admin/users
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { users, pagination } = await adminService.getUsers(req.query as any);
  res.status(200).json(new ApiResponse(200, 'Users fetched successfully', { users, pagination }));
});

// GET /api/v1/admin/users/:id
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getUserById(req.params.id as string);
  res.status(200).json(new ApiResponse(200, 'User fetched successfully', result));
});

// PATCH /api/v1/admin/users/:id/status
export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.updateUserStatus(req.params.id as string, req.body);
  res.status(200).json(new ApiResponse(200, 'User status updated successfully', user));
});

// ─── Seller Applications ──────────────────────────────────────────────────────

// GET /api/v1/admin/seller-applications
export const getSellerApplications = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const { applicants, pagination } = await adminService.getSellerApplications(page, limit);
  res
    .status(200)
    .json(new ApiResponse(200, 'Seller applications fetched successfully', { applicants, pagination }));
});

// PATCH /api/v1/admin/seller-applications/:id
export const handleSellerApplication = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.handleSellerApplication(req.params.id as string, req.body);
  const msg =
    req.body.action === 'approve' ? 'Seller application approved' : 'Seller application rejected';
  res.status(200).json(new ApiResponse(200, msg, user));
});

// ─── Services ─────────────────────────────────────────────────────────────────

// GET /api/v1/admin/services
export const getAllServices = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const isActive =
    req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

  const { services, pagination } = await adminService.getAllServices(page, limit, isActive);
  res.status(200).json(new ApiResponse(200, 'Services fetched successfully', { services, pagination }));
});

// PATCH /api/v1/admin/services/:id/feature
export const featureService = asyncHandler(async (req: Request, res: Response) => {
  const service = await adminService.featureService(req.params.id as string, req.body);
  const msg = req.body.isFeatured ? 'Service featured successfully' : 'Service unfeatured';
  res.status(200).json(new ApiResponse(200, msg, service));
});

// DELETE /api/v1/admin/services/:id
export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  await adminService.adminDeleteService(req.params.id as string);
  res.status(200).json(new ApiResponse(200, 'Service deactivated successfully'));
});

// ─── Orders ───────────────────────────────────────────────────────────────────

// GET /api/v1/admin/orders
export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string | undefined;

  const { orders, pagination } = await adminService.getAllOrders(page, limit, status);
  res.status(200).json(new ApiResponse(200, 'Orders fetched successfully', { orders, pagination }));
});

// ─── Analytics ────────────────────────────────────────────────────────────────

// GET /api/v1/admin/analytics
export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.getAnalytics(req.query as any);
  res.status(200).json(new ApiResponse(200, 'Analytics fetched successfully', data));
});

// ─── Announcements ────────────────────────────────────────────────────────────

// POST /api/v1/admin/announcements
export const sendAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await adminService.sendAnnouncement(req.body);
  res.status(200).json(new ApiResponse(200, `Announcement sent to ${result.sent} users`, result));
});
