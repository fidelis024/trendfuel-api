import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { submitKYCSchema } from '../../schemas/zod/seller-registration.validator';
import * as sellerRegistrationController from './seller-registration.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Seller Registration
 *   description: Become a seller — wallet payment + KYC submission
 */

/**
 * @swagger
 * /seller-registration/pay:
 *   post:
 *     summary: Pay the one-time seller registration fee from wallet
 *     tags: [Seller Registration]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Deducts ₦40,000 from the buyer's wallet balance.
 *       - Returns 402 with shortfall amount if balance is insufficient
 *       - Returns 400 if fee has already been paid
 *       - Once paid, user must proceed to submit KYC via /seller-registration/kyc
 *     responses:
 *       200:
 *         description: Fee deducted successfully — proceed to KYC
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 feePaid:
 *                   type: boolean
 *                   example: true
 *                 amountDeducted:
 *                   type: number
 *                   example: 40000
 *                 walletBalance:
 *                   type: number
 *                   example: 10000
 *       402:
 *         description: Insufficient wallet balance
 *       400:
 *         description: Fee already paid or user is already a seller
 */
router.post('/pay', authenticate, authorize('buyer'), sellerRegistrationController.paySellerFee);

/**
 * @swagger
 * /seller-registration/kyc:
 *   post:
 *     summary: Submit KYC details after paying registration fee
 *     tags: [Seller Registration]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Submits identity verification details for admin review.
 *       - Fee must be paid first via /seller-registration/pay
 *       - If previously rejected, resubmission is allowed
 *       - Admin approves via PATCH /admin/seller-applications/:id
 *       - All fields are required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, nin, dateOfBirth, phone, streetAddress, city, state]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               nin:
 *                 type: string
 *                 description: 11-digit National Identification Number
 *                 example: "12345678901"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1995-06-15"
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               streetAddress:
 *                 type: string
 *                 example: "12 Allen Avenue"
 *               city:
 *                 type: string
 *                 example: "Lagos"
 *               state:
 *                 type: string
 *                 example: "Lagos"
 *     responses:
 *       200:
 *         description: KYC submitted — under review for 24–48 hours
 *       400:
 *         description: Fee not paid, already approved, or KYC already pending
 */
router.post(
  '/kyc',
  authenticate,
  authorize('buyer'),
  validate(submitKYCSchema),
  sellerRegistrationController.submitKYC
);

/**
 * @swagger
 * /seller-registration/status:
 *   get:
 *     summary: Check your seller registration status
 *     tags: [Seller Registration]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns current state of the seller registration process:
 *       - Whether the fee has been paid
 *       - Application status (pending / approved / rejected)
 *       - KYC submission status and rejection reason if applicable
 *     responses:
 *       200:
 *         description: Registration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: string
 *                   example: buyer
 *                 accessFeePaid:
 *                   type: boolean
 *                   example: true
 *                 applicationStatus:
 *                   type: string
 *                   enum: [pending, approved, rejected]
 *                   example: pending
 *                 kyc:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: pending
 *                     rejectionReason:
 *                       type: string
 *                       nullable: true
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                     reviewedAt:
 *                       type: string
 *                       format: date-time
 */
router.get(
  '/status',
  authenticate,
  authorize('buyer'),
  sellerRegistrationController.getRegistrationStatus
);

export default router;
