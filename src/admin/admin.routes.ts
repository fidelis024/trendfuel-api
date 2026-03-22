import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authenticate';
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
} from '../schemas/zod/admin.schema';
import * as adminController from './admin.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

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
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [admin, buyer, seller] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, suspended, banned, pending] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
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
 *       404:
 *         description: User not found
 */
router.get('/users/:id', validate(userIdParamSchema), adminController.getUserById);

/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Update user status (suspend, ban, or reactivate)
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

// ─── Seller Applications ──────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/seller-applications:
 *   get:
 *     summary: Get all pending seller applications
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
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
 *                 description: Required if rejecting
 *     responses:
 *       200:
 *         description: Application processed, seller notified by email
 */
router.patch(
  '/seller-applications/:id',
  validate(sellerApplicationSchema),
  adminController.handleSellerApplication
);

// ─── Services ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/services:
 *   get:
 *     summary: Get all services including inactive ones
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: All services
 */
router.get('/services', adminController.getAllServices);

/**
 * @swagger
 * /admin/services/{id}/feature:
 *   patch:
 *     summary: Feature or unfeature a service listing
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
 *             required: [isFeatured]
 *             properties:
 *               isFeatured:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Service featured status updated
 */
router.patch(
  '/services/:id/feature',
  validate(featureServiceSchema),
  adminController.featureService
);

/**
 * @swagger
 * /admin/services/{id}:
 *   delete:
 *     summary: Deactivate a service listing
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
 *         description: Service deactivated
 */
router.delete('/services/:id', validate(serviceIdParamSchema), adminController.deleteService);

// ─── Orders ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: Get all orders across all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, delivered, completed, disputed, cancelled, refunded]
 *     responses:
 *       200:
 *         description: All orders paginated
 */
router.get('/orders', validate(getAdminOrdersSchema), adminController.getAllOrders);

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/analytics:
 *   get:
 *     summary: Get platform analytics with time-series data
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
 *         description: |
 *           Returns:
 *           - overview: totals (users, orders, revenue, disputes)
 *           - timeSeries.revenue: daily revenue array [{date, revenue, count}]
 *           - timeSeries.users: daily signups [{date, buyers, sellers, total}]
 *           - timeSeries.orders: daily orders [{date, statuses, total}]
 *           - topSellers: top 10 sellers by lifetime earnings
 *           - orderStatusBreakdown: count per status
 */
router.get('/analytics', validate(analyticsSchema), adminController.getAnalytics);

// ─── Announcements ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/announcements:
 *   post:
 *     summary: Send a platform announcement email to users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               subject:
 *                 type: string
 *                 example: Important update from TrendFuel
 *               message:
 *                 type: string
 *                 example: We have updated our terms of service...
 *               targetRole:
 *                 type: string
 *                 enum: [all, buyer, seller]
 *                 default: all
 *     responses:
 *       200:
 *         description: Announcement sent, returns count of emails sent
 */
router.post('/announcements', validate(announcementSchema), adminController.sendAnnouncement);

export default router;
