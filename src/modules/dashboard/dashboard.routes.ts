import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/authenticate';
import * as dashboardController from './dashboard.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard overview stats for buyers and sellers
 */

/**
 * @swagger
 * /dashboard/buyer:
 *   get:
 *     summary: Get buyer dashboard overview
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns stats and recent activity for the buyer dashboard:
 *       - Total orders placed
 *       - Active orders (pending + processing + delivered)
 *       - Total amount spent on completed orders (in kobo)
 *       - Number of completed orders not yet reviewed
 *       - Wallet balance (in kobo)
 *       - 5 most recent orders
 *     responses:
 *       200:
 *         description: Buyer dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalOrders:
 *                       type: integer
 *                       example: 12
 *                     activeOrders:
 *                       type: integer
 *                       example: 2
 *                     totalSpent:
 *                       type: integer
 *                       description: Total spent in kobo
 *                       example: 5000000
 *                     reviewsLeft:
 *                       type: integer
 *                       description: Completed orders with no review yet
 *                       example: 3
 *                     walletBalance:
 *                       type: integer
 *                       description: Wallet balance in kobo
 *                       example: 2000000
 *                 recentOrders:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/buyer', authenticate, dashboardController.getBuyerDashboard);

/**
 * @swagger
 * /dashboard/seller:
 *   get:
 *     summary: Get seller dashboard overview
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns stats and recent activity for the seller dashboard:
 *       - Active service listings
 *       - Pending orders needing action
 *       - Total lifetime earnings (in kobo)
 *       - This month's earnings (in kobo)
 *       - Average rating
 *       - Pending and cleared wallet balances
 *       - 5 most recent orders
 *     responses:
 *       200:
 *         description: Seller dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     activeServices:
 *                       type: integer
 *                       example: 3
 *                     pendingOrders:
 *                       type: integer
 *                       example: 5
 *                     totalEarnings:
 *                       type: integer
 *                       description: Lifetime earnings in kobo
 *                       example: 15000000
 *                     thisMonthEarnings:
 *                       type: integer
 *                       description: This month earnings in kobo
 *                       example: 3000000
 *                     avgRating:
 *                       type: number
 *                       example: 4.8
 *                     pendingBalance:
 *                       type: integer
 *                       example: 500000
 *                     clearedBalance:
 *                       type: integer
 *                       example: 1000000
 *                 recentOrders:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get(
  '/seller',
  authenticate,
  authorize('seller', 'admin', 'super_admin'),
  dashboardController.getSellerDashboard
);

export default router;
