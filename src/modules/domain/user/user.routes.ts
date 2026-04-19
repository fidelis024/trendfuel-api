import { Router } from 'express';
import { authenticate } from '../../../middlewares/authenticate';
import { validate } from '../../../middlewares/validate';
import { updateProfileSchema, changePasswordSchema } from './user.validator';
import * as userController from './user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile endpoints
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [admin, buyer, seller]
 *                     status:
 *                       type: string
 *                       enum: [active, suspended, banned, pending]
 *                     emailVerified:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/me', userController.getMe);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update current user profile (firstName and/or lastName)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Michael
 *               lastName:
 *                 type: string
 *                 example: Peter
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);

/**
 * @swagger
 * /users/me/change-password:
 *   patch:
 *     summary: Change current user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmNewPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldSecret123
 *               newPassword:
 *                 type: string
 *                 example: NewSecret456
 *               confirmNewPassword:
 *                 type: string
 *                 example: NewSecret456
 *     responses:
 *       200:
 *         description: Password changed, cookies cleared, must log in again
 *       400:
 *         description: Current password incorrect or validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/me/change-password', validate(changePasswordSchema), userController.changePassword);

/**
 * @swagger
 * /users/seller/{sellerId}:
 *   get:
 *     summary: Get a seller's public profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns a seller's public profile visible to anyone.
 *
 *       **KYC details** (fullName, NIN, DOB, phone, address) are only included if:
 *       - The requester is the seller themselves
 *       - The requester is an admin or super_admin
 *
 *       Everyone else gets the public profile only (bio, niche, metrics, level).
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema: { type: string }
 *         description: The seller's user ID
 *     responses:
 *       200:
 *         description: Seller profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 sellerProfile:
 *                   type: object
 *                   properties:
 *                     bio:
 *                       type: string
 *                     country:
 *                       type: string
 *                     niche:
 *                       type: string
 *                     level:
 *                       type: string
 *                       enum: [new, rising, top, pro]
 *                     badge:
 *                       type: string
 *                       nullable: true
 *                 sellerMetrics:
 *                   type: object
 *                   properties:
 *                     avgRating:
 *                       type: number
 *                     completionRate:
 *                       type: number
 *                     totalOrders:
 *                       type: integer
 *                     disputeRate:
 *                       type: number
 *                 memberSince:
 *                   type: string
 *                   format: date-time
 *                 kyc:
 *                   description: Only present for the seller themselves or admins
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     fullName:
 *                       type: string
 *                     nin:
 *                       type: string
 *                     dateOfBirth:
 *                       type: string
 *                       format: date
 *                     phone:
 *                       type: string
 *                     streetAddress:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected]
 *                     rejectionReason:
 *                       type: string
 *                       nullable: true
 *       404:
 *         description: Seller not found
 */
router.get('/seller/:sellerId', authenticate, userController.getSellerProfile);

/**
 * @swagger
 * /users/me:
 *   delete:
 *     summary: Deactivate current user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 example: Secret123
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *       400:
 *         description: Password incorrect
 *       401:
 *         description: Unauthorized
 */
router.delete('/me', userController.deactivateAccount);

export default router;
