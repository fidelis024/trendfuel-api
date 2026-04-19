import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { upload } from '../../utils/upload';
import {
  openDisputeSchema,
  sellerRespondSchema,
  resolveDisputeSchema,
  getDisputesSchema,
  disputeIdSchema,
} from '../../schemas/zod/dispute.schema';
import * as disputeController from './dispute.controller';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Disputes
 *   description: Order dispute management
 */

/**
 * @swagger
 * /disputes:
 *   post:
 *     summary: Open a dispute on a delivered order (buyer only)
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, reason, buyerStatement]
 *             properties:
 *               orderId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 example: Service not delivered as described
 *               buyerStatement:
 *                 type: string
 *                 example: The seller promised 1000 followers but I only received 200...
 *     responses:
 *       201:
 *         description: Dispute opened, seller notified
 *       400:
 *         description: Order not in delivered state
 *       409:
 *         description: Dispute already exists for this order
 */
router.post(
  '/',
  authorize('buyer', 'seller', 'admin', 'super_admin'),
  validate(openDisputeSchema),
  disputeController.openDispute
);

/**
 * @swagger
 * /disputes:
 *   get:
 *     summary: Get disputes for current user (buyer/seller sees own, admin sees all)
 *     tags: [Disputes]
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
 *           enum: [open, seller_responded, under_review, resolved]
 *     responses:
 *       200:
 *         description: Paginated list of disputes
 */
router.get('/', validate(getDisputesSchema), disputeController.getDisputes);

/**
 * @swagger
 * /disputes/{id}:
 *   get:
 *     summary: Get a single dispute with all evidence
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dispute detail with evidence files
 *       403:
 *         description: Not your dispute
 *       404:
 *         description: Dispute not found
 */
router.get('/:id', validate(disputeIdSchema), disputeController.getDisputeById);

/**
 * @swagger
 * /disputes/{id}/respond:
 *   patch:
 *     summary: Seller submits their response to a dispute
 *     tags: [Disputes]
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
 *             required: [sellerResponse]
 *             properties:
 *               sellerResponse:
 *                 type: string
 *                 example: I delivered the service as promised. Here is the proof...
 *     responses:
 *       200:
 *         description: Response submitted
 *       400:
 *         description: Dispute not in open state
 */
router.patch(
  '/:id/respond',
  authorize('seller', 'admin', 'super_admin'),
  validate(sellerRespondSchema),
  disputeController.sellerRespond
);

/**
 * @swagger
 * /disputes/{id}/evidence:
 *   post:
 *     summary: Upload evidence file for a dispute (buyer or seller)
 *     tags: [Disputes]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Evidence uploaded to Cloudinary
 *       400:
 *         description: No file or max 5 files reached
 */
router.post(
  '/:id/evidence',
  authorize('buyer', 'seller', 'admin', 'super_admin'),
  upload.single('file'),
  disputeController.uploadEvidence
);

/**
 * @swagger
 * /disputes/{id}/resolve:
 *   patch:
 *     summary: Resolve a dispute (admin only)
 *     tags: [Disputes]
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
 *             required: [resolution]
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum: [refund_full, refund_partial, no_refund]
 *               refundAmount:
 *                 type: integer
 *                 description: Required for refund_partial (in cents)
 *               sellerPenalty:
 *                 type: string
 *                 enum: [warning, ranking_drop, suspension, ban, none]
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dispute resolved, escrow handled, both parties notified
 *       400:
 *         description: Already resolved or invalid refund amount
 */
router.patch(
  '/:id/resolve',
  authorize('admin', 'super_admin'),
  validate(resolveDisputeSchema),
  disputeController.resolveDispute
);

export default router;
