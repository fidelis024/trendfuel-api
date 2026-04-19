import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  createServiceSchema,
  updateServiceSchema,
  getServicesSchema,
  serviceIdSchema,
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} from '../../schemas/zod/service.schema';
import * as serviceController from './service.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Marketplace service listings
 */

/**
 * @swagger
 * /services/categories:
 *   get:
 *     summary: Get all active categories
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [instagram, tiktok, youtube, x, facebook, linkedin, snapchat, spotify, telegram, other]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', serviceController.getCategories);

/**
 * @swagger
 * /services/{id}/price-preview:
 *   get:
 *     summary: Preview the total price before placing an order
 *     tags: [Services]
 *     description: |
 *       Calculates the exact cost breakdown for a given quantity before the buyer
 *       commits to purchasing. No money moves, no order is created.
 *
 *       Use this to power the real-time price calculator on the service detail page.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Service ID
 *       - in: query
 *         name: quantity
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of units the buyer wants to purchase
 *         example: 500
 *     responses:
 *       200:
 *         description: Price breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serviceId:
 *                   type: string
 *                 serviceTitle:
 *                   type: string
 *                   example: 1000 Instagram Followers
 *                 seller:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     level:
 *                       type: string
 *                       enum: [new, rising, top, pro]
 *                 category:
 *                   type: string
 *                   example: Instagram
 *                 quantity:
 *                   type: integer
 *                   example: 500
 *                 unitPrice:
 *                   type: integer
 *                   description: Price per unit in kobo
 *                   example: 50000
 *                 totalAmount:
 *                   type: integer
 *                   description: Total in kobo (unitPrice × quantity)
 *                   example: 25000000
 *                 platformFee:
 *                   type: integer
 *                   description: Platform commission in kobo
 *                   example: 5000000
 *                 sellerEarnings:
 *                   type: integer
 *                   description: What seller receives in kobo
 *                   example: 20000000
 *                 deliveryHours:
 *                   type: integer
 *                   example: 24
 *                 requiresCredentials:
 *                   type: boolean
 *                   example: false
 *                 refillPolicy:
 *                   type: object
 *                   properties:
 *                     offered:
 *                       type: boolean
 *                     windowDays:
 *                       type: integer
 *                     conditions:
 *                       type: string
 *                 note:
 *                   type: string
 *                   example: All amounts in kobo (divide by 100 for NGN)
 *       400:
 *         description: Quantity out of range or missing
 *       404:
 *         description: Service not found or inactive
 */
router.get('/:id/price-preview', serviceController.getPricePreview);

/**
 * @swagger
 * /services/categories:
 *   post:
 *     summary: Create a new category (admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platform, name, slug]
 *             properties:
 *               platform: { type: string, example: instagram }
 *               name: { type: string, example: Instagram Followers }
 *               slug: { type: string, example: instagram-followers }
 *     responses:
 *       201:
 *         description: Category created
 *       409:
 *         description: Slug already exists
 */
router.post(
  '/categories',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(createCategorySchema),
  serviceController.createCategory
);

/**
 * @swagger
 * /services/categories/{id}:
 *   patch:
 *     summary: Update a category (admin only)
 *     tags: [Services]
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
 *             properties:
 *               platform: { type: string }
 *               name: { type: string }
 *               slug: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Category updated
 *       404:
 *         description: Category not found
 *       409:
 *         description: Slug already exists
 */
router.patch(
  '/categories/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(updateCategorySchema),
  serviceController.updateCategory
);

/**
 * @swagger
 * /services/categories/{id}:
 *   delete:
 *     summary: Deactivate a category (admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Category deactivated
 *       404:
 *         description: Category not found
 */
router.delete(
  '/categories/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(categoryIdSchema),
  serviceController.deleteCategory
);

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Browse marketplace services
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: platform
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: integer }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: integer }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [rankScore, pricePerUnit, createdAt, stats.avgRating]
 *           default: rankScore
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: featured
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of services
 */
router.get('/', validate(getServicesSchema), serviceController.getServices);

/**
 * @swagger
 * /services/my:
 *   get:
 *     summary: Get current seller's own listings
 *     tags: [Services]
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
 *         description: Seller's own service listings
 */
router.get('/my', authenticate, authorize('seller', 'admin', 'super_admin'), serviceController.getMyServices);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Get a single service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Service detail
 *       404:
 *         description: Service not found
 */
router.get('/:id', validate(serviceIdSchema), serviceController.getServiceById);

/**
 * @swagger
 * /services:
 *   post:
 *     summary: Create a new service listing (seller only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, title, description, pricePerUnit, minQty, maxQty, deliveryHours]
 *             properties:
 *               categoryId: { type: string }
 *               title: { type: string, example: 1000 Instagram Followers }
 *               description: { type: string }
 *               pricePerUnit: { type: integer, example: 500 }
 *               minQty: { type: integer, example: 100 }
 *               maxQty: { type: integer, example: 10000 }
 *               deliveryHours: { type: integer, example: 24 }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Service created
 */
router.post(
  '/',
  authenticate,
  authorize('seller', 'admin', 'super_admin'),
  validate(createServiceSchema),
  serviceController.createService
);

/**
 * @swagger
 * /services/{id}:
 *   patch:
 *     summary: Update a service listing (seller must own it)
 *     tags: [Services]
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
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               pricePerUnit: { type: integer }
 *               minQty: { type: integer }
 *               maxQty: { type: integer }
 *               deliveryHours: { type: integer }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Service updated
 *       404:
 *         description: Not found or not owned
 */
router.patch(
  '/:id',
  authenticate,
  authorize('seller', 'admin', 'super_admin'),
  validate(updateServiceSchema),
  serviceController.updateService
);

/**
 * @swagger
 * /services/{id}:
 *   delete:
 *     summary: Deactivate a service listing (seller must own it)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Service deleted
 *       404:
 *         description: Not found or not owned
 */
router.delete(
  '/:id',
  authenticate,
  authorize('seller', 'admin', 'super_admin'),
  validate(serviceIdSchema),
  serviceController.deleteService
);

export default router;
