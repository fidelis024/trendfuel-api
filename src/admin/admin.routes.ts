import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize, superAdminOnly } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import {
  updateUserStatusSchema,
  sellerApplicationSchema,
  featureServiceSchema,
  getUsersSchema,
  getAdminOrdersSchema,
  analyticsSchema,
  announcementSchema,
  userIdParamSchema,
  serviceIdParamSchema,
  updateCommissionSchema,
  makeAdminSchema,
  removeAdminSchema,
} from '../schemas/zod/admin.schema';
import * as adminController from './admin.controller';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin panel endpoints
 */

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (paginated, filterable)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [admin, buyer, seller, super_admin] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, suspended, banned, pending] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.get('/users', validate(getUsersSchema), adminController.getUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get a single user with wallet and order count
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User detail with wallet and stats
 */
router.get('/users/:id', validate(userIdParamSchema), adminController.getUserById);

/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Suspend, ban, or reactivate a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended, banned]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User status updated
 */
router.patch(
  '/users/:id/status',
  validate(updateUserStatusSchema),
  adminController.updateUserStatus
);

/**
 * @swagger
 * /admin/users/{id}/make-admin:
 *   patch:
 *     summary: Promote a user to admin (super_admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User promoted to admin
 *       400:
 *         description: User is already an admin
 *       404:
 *         description: User not found
 */
router.patch(
  '/users/:id/make-admin',
  superAdminOnly,
  validate(makeAdminSchema),
  adminController.makeAdmin
);

/**
 * @swagger
 * /admin/users/{id}/remove-admin:
 *   patch:
 *     summary: Demote an admin back to buyer (super_admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Admin demoted to buyer
 *       400:
 *         description: User is not an admin
 *       403:
 *         description: Cannot demote a super admin
 */
router.patch(
  '/users/:id/remove-admin',
  superAdminOnly,
  validate(removeAdminSchema),
  adminController.removeAdmin
);

// ─── Admin Management ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/management:
 *   get:
 *     summary: Get all admin accounts (super_admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all admin and super_admin accounts
 */
router.get('/management', superAdminOnly, adminController.getAllAdmins);

// ─── Seller Applications ──────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/seller-applications:
 *   get:
 *     summary: Get all pending seller applications
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending seller applications
 */
router.get('/seller-applications', adminController.getSellerApplications);

/**
 * @swagger
 * /admin/seller-applications/{id}:
 *   patch:
 *     summary: Approve or reject a seller application
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application processed
 */
router.patch(
  '/seller-applications/:id',
  validate(sellerApplicationSchema),
  adminController.handleSellerApplication
);

// ─── Commission Settings ──────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/commissions:
 *   get:
 *     summary: Get current commission settings and revenue breakdown
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Commission config + platform/seller revenue split
 */
router.get('/commissions', adminController.getCommissionSettings);

/**
 * @swagger
 * /admin/commissions:
 *   patch:
 *     summary: Update commission settings (super_admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commissionRate:
 *                 type: number
 *                 description: 0.01 to 0.50 (1% to 50%)
 *                 example: 0.20
 *               sellerAccessFee:
 *                 type: integer
 *                 description: In cents
 *                 example: 1500
 *               withdrawalFeeRate:
 *                 type: number
 *                 description: 0 to 0.20
 *                 example: 0.03
 *               orderAutoCompleteHours:
 *                 type: integer
 *                 example: 72
 *               sellerRespondHours:
 *                 type: integer
 *                 example: 48
 *               withdrawalDelayDays:
 *                 type: integer
 *                 example: 7
 *     responses:
 *       200:
 *         description: Commission settings updated
 *       403:
 *         description: Super admin only
 */
router.patch(
  '/commissions',
  superAdminOnly,
  validate(updateCommissionSchema),
  adminController.updateCommissionSettings
);

// ─── Services ─────────────────────────────────────────────────────────────────

router.get('/services', adminController.getAllServices);
router.patch(
  '/services/:id/feature',
  validate(featureServiceSchema),
  adminController.featureService
);
router.delete('/services/:id', validate(serviceIdParamSchema), adminController.deleteService);

// ─── Orders ───────────────────────────────────────────────────────────────────

router.get('/orders', validate(getAdminOrdersSchema), adminController.getAllOrders);

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/analytics:
 *   get:
 *     summary: Platform analytics with time-series data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Full analytics payload
 */
router.get('/analytics', validate(analyticsSchema), adminController.getAnalytics);

// ─── Announcements ────────────────────────────────────────────────────────────

router.post('/announcements', validate(announcementSchema), adminController.sendAnnouncement);

export default router;
