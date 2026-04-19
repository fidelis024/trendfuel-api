import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createReviewSchema,
  getReviewsSchema,
  reviewIdSchema,
  sellerIdParamSchema,
} from '../../schemas/zod/review.schema';
import * as reviewController from './review.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Service reviews and ratings
 */

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Post a review for a completed order (buyer only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, rating, comment]
 *             properties:
 *               orderId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Excellent service, delivered fast and exactly as described!
 *     responses:
 *       201:
 *         description: Review posted successfully
 *       400:
 *         description: Order not completed or already reviewed
 *       404:
 *         description: Order not found
 *       409:
 *         description: Already reviewed this order
 */
router.post(
  '/',
  authenticate,
  authorize('buyer', 'seller', 'admin', 'super_admin'),
  validate(createReviewSchema),
  reviewController.createReview
);

/**
 * @swagger
 * /reviews/reviewable-orders:
 *   get:
 *     summary: Get buyer's completed orders that are eligible for review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns all completed orders the buyer has not yet reviewed.
 *       Use this to populate the "Leave a Review" order picker on the frontend.
 *       Each order includes the service title and seller name.
 *     responses:
 *       200:
 *         description: List of reviewable orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: Order ID — pass this as orderId when creating a review
 *                   totalAmount:
 *                     type: integer
 *                     description: Amount paid in kobo
 *                   completedAt:
 *                     type: string
 *                     format: date-time
 *                   service:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *                         example: 1000 Instagram Followers
 *                   seller:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 */
router.get('/reviewable-orders', authenticate, reviewController.getReviewableOrders);

/**
 * @swagger
 * /reviews/seller/{sellerId}:
 *   get:
 *     summary: Get all reviews for a seller (public) — includes rating summary breakdown
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Seller reviews with rating summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                     summary:
 *                       type: object
 *                       properties:
 *                         avgRating:
 *                           type: number
 *                           example: 4.7
 *                         total:
 *                           type: integer
 *                         breakdown:
 *                           type: object
 *                           properties:
 *                             "5": { type: integer }
 *                             "4": { type: integer }
 *                             "3": { type: integer }
 *                             "2": { type: integer }
 *                             "1": { type: integer }
 */
router.get(
  '/seller/:sellerId',
  validate(sellerIdParamSchema),
  validate(getReviewsSchema),
  reviewController.getSellerReviews
);

/**
 * @swagger
 * /reviews/service/{serviceId}:
 *   get:
 *     summary: Get all reviews for a specific service listing (public)
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Service reviews
 */
router.get('/service/:serviceId', validate(getReviewsSchema), reviewController.getServiceReviews);

/**
 * @swagger
 * /reviews/order/{orderId}:
 *   get:
 *     summary: Get the buyer's own review for a specific order
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review for this order
 *       404:
 *         description: No review found for this order
 */
router.get('/order/:orderId', authenticate, reviewController.getMyReview);

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete your own review (buyer only, within 24 hours of posting)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review deleted
 *       400:
 *         description: Cannot delete after 24 hours
 *       404:
 *         description: Review not found
 */
router.delete(
  '/:id',
  authenticate,
  authorize('buyer', 'seller', 'admin', 'super_admin'),
  validate(reviewIdSchema),
  reviewController.deleteReview
);

export default router;
