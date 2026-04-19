import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  placeOrderSchema,
  deliverOrderSchema,
  orderIdSchema,
  getOrdersSchema,
  orderCredentialsSchema, // ← ADD import
} from '../../schemas/zod/order.schema';
import * as orderController from './order.controller';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Place a new order (buyer only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, quantity]
 *             properties:
 *               serviceId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 example: 1000
 *               buyerNote:
 *                 type: string
 *                 example: Please deliver within 24 hours
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Insufficient balance or invalid quantity
 *       404:
 *         description: Service not found
 */
router.post('/', validate(placeOrderSchema), orderController.placeOrder);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get orders for current user
 *     tags: [Orders]
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
 *         description: Paginated list of orders
 */
router.get('/', validate(getOrdersSchema), orderController.getOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order detail
 *       403:
 *         description: Not your order
 *       404:
 *         description: Order not found
 */
router.get('/:id', validate(orderIdSchema), orderController.getOrderById);

/**
 * @swagger
 * /orders/{id}/deliver:
 *   patch:
 *     summary: Mark order as delivered (seller only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Marks an order as delivered.
 *
 *       **Credentials behaviour:**
 *       - If `service.requiresCredentials` is `true`, the `credentials` array is **mandatory**
 *       - If `service.requiresCredentials` is `false`, credentials are optional
 *       - At least one of `deliveryLink` or `credentials` must be provided
 *       - Buyer cannot see credentials until they mark the order as **completed**
 *       - Seller and admin can always view credentials via `GET /orders/:id/credentials`
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
 *             properties:
 *               deliveryLink:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/proof-screenshot
 *               credentials:
 *                 type: array
 *                 maxItems: 20
 *                 description: Flexible label/value pairs. Required if service.requiresCredentials is true.
 *                 items:
 *                   type: object
 *                   required: [label, value]
 *                   properties:
 *                     label:
 *                       type: string
 *                       example: Username
 *                     value:
 *                       type: string
 *                       example: john_doe_ig
 *     responses:
 *       200:
 *         description: Order marked as delivered
 *       400:
 *         description: Order not in deliverable state, credentials required but missing, or neither deliveryLink nor credentials provided
 *       403:
 *         description: Not your order
 *       404:
 *         description: Order not found
 */
router.patch(
  '/:id/deliver',
  authorize('seller', 'admin', 'super_admin'),
  validate(deliverOrderSchema),
  orderController.deliverOrder
);

/**
 * @swagger
 * /orders/{id}/complete:
 *   patch:
 *     summary: Confirm delivery and release payment to seller (buyer only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order completed, payment released to seller
 *       400:
 *         description: Order not in delivered state
 */
router.patch('/:id/complete', validate(orderIdSchema), orderController.completeOrder);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   patch:
 *     summary: Cancel order and refund buyer (buyer or admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order cancelled and full refund credited to buyer wallet
 *       400:
 *         description: Order cannot be cancelled in current status
 */
router.patch(
  '/:id/cancel',
  authorize('buyer', 'seller', 'admin', 'super_admin'),
  validate(orderIdSchema),
  orderController.cancelOrder
);

/**
 * @swagger
 * /orders/{id}/credentials:
 *   get:
 *     summary: Get credentials attached to an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns the credentials attached by the seller during delivery.
 *
 *       **Access rules:**
 *       - **Buyer** — only accessible after order status is `completed`
 *       - **Seller** — accessible anytime after delivery
 *       - **Admin** — accessible anytime
 *
 *       Credentials are a flexible array of `{ label, value }` pairs defined by the seller.
 *       The buyer cannot view them until they confirm completion — this protects the seller
 *       from buyers completing escrow without intending to.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Credentials retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: string
 *                   example: 664f1b2e8c1a4d001e3b5f77
 *                 credentials:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         example: Username
 *                       value:
 *                         type: string
 *                         example: john_doe_ig
 *                 credentialsUpdatedAt:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: |
 *           - Not a party to this order
 *           - Buyer attempting to view before order is completed
 *       404:
 *         description: Order not found or no credentials attached
 */
router.get(
  '/:id/credentials',
  authorize('buyer', 'seller', 'admin', 'super_admin'),
  validate(orderCredentialsSchema),
  orderController.getOrderCredentials
);

export default router;
