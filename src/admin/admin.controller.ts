import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import * as adminService from './admin.service';
import { getWithdrawals, markWithdrawalSent } from './admin.service';

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
    .json(
      new ApiResponse(200, 'Seller applications fetched successfully', { applicants, pagination })
    );
});

// PATCH /api/v1/admin/seller-applications/:id
// PATCH /api/v1/admin/seller-applications/:id
export const handleSellerApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const user = await adminService.handleSellerApplication(
    req.user._id.toString(), // ← adminId for KYC reviewedBy
    req.params.id as string,
    req.body
  );
  const msg =
    req.body.action === 'approve' ? 'Seller application approved' : 'Seller application rejected';
  res.status(200).json(new ApiResponse(200, msg, user));
});

// GET /api/v1/admin/seller-applications/:id/kyc
export const getSellerKYC = asyncHandler(async (req: Request, res: Response) => {
  const kyc = await adminService.getSellerKYC(req.params.id as string);
  res.status(200).json(new ApiResponse(200, 'KYC details fetched successfully', kyc));
});

// ─── Services ─────────────────────────────────────────────────────────────────

// GET /api/v1/admin/services
export const getAllServices = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const isActive =
    req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

  const { services, pagination } = await adminService.getAllServices(page, limit, isActive);
  res
    .status(200)
    .json(new ApiResponse(200, 'Services fetched successfully', { services, pagination }));
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


// ─── Commission ───────────────────────────────────────────────────────────────

// GET /api/v1/admin/commissions
export const getCommissionSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.getCommissionSettings();
  res.status(200).json(new ApiResponse(200, 'Commission settings fetched successfully', data));
});

// PATCH /api/v1/admin/commissions
export const updateCommissionSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const config = await adminService.updateCommissionSettings(req.body, req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Commission settings updated successfully', config));
});

// ─── Admin Management ─────────────────────────────────────────────────────────

// GET /api/v1/admin/management
export const getAllAdmins = asyncHandler(async (req: Request, res: Response) => {
  const admins = await adminService.getAllAdmins();
  res.status(200).json(new ApiResponse(200, 'Admins fetched successfully', admins));
});

// PATCH /api/v1/admin/users/:id/make-admin
export const makeAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const user = await adminService.makeAdmin(req.params.id as string, req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'User promoted to admin successfully', user));
});

// PATCH /api/v1/admin/users/:id/remove-admin
export const removeAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const user = await adminService.removeAdmin(req.params.id as string, req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Admin demoted to buyer successfully', user));
});


/**
 * GET /api/v1/admin/withdrawals
 * Get all seller withdrawal requests with seller info populated.
 * Supports optional ?status=pending|completed|failed filter.
 */
export const getWithdrawalsController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await getWithdrawals(req.query as any);
  res.status(200).json(new ApiResponse(200, 'Withdrawals fetched successfully', result));
});


/**
 * PATCH /api/v1/admin/withdrawals/:transactionId/mark-sent
 * Admin marks a pending withdrawal as sent after transferring USDT manually.
 * Triggers an email to the seller confirming the transfer.
 */
export const markWithdrawalSentController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  await markWithdrawalSent(req.params.transactionId as string, req.user._id.toString());
  res
    .status(200)
    .json(new ApiResponse(200, 'Withdrawal marked as sent. Seller has been notified via email.', null));
});


