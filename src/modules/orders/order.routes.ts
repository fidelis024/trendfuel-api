import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  placeOrderSchema,
  deliverOrderSchema,
  orderIdSchema,
  getOrdersSchema,
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
router.post('/', authorize('buyer', 'admin'), validate(placeOrderSchema), orderController.placeOrder);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get orders for current user (buyer sees their purchases, seller sees their sales)
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
 *             required: [deliveryLink]
 *             properties:
 *               deliveryLink:
 *                 type: string
 *                 example: https://example.com/proof-screenshot
 *     responses:
 *       200:
 *         description: Order marked as delivered, buyer notified
 *       400:
 *         description: Order cannot be delivered in current status
 */
router.patch(
  '/:id/deliver',
  authorize('seller', 'admin'),
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
router.patch(
  '/:id/complete',
  authorize('buyer', 'admin'),
  validate(orderIdSchema),
  orderController.completeOrder
);

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
  authorize('buyer', 'admin'),
  validate(orderIdSchema),
  orderController.cancelOrder
);

export default router;