import { Router } from 'express';
import { validate } from '../../../middlewares/validate';
import { authenticate } from '../../../middlewares/authenticate';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validator';
import * as authController from './auth.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, confirmPassword, agreeToTerms]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Michael
 *               lastName:
 *                 type: string
 *                 example: Peter
 *               email:
 *                 type: string
 *                 example: michael@example.com
 *               password:
 *                 type: string
 *                 example: Secret123
 *               confirmPassword:
 *                 type: string
 *                 example: Secret123
 *               agreeToTerms:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Registration successful, verification email sent
 *       409:
 *         description: Email already in use
 *       400:
 *         description: Validation error
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify email address
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get('/verify-email/:token', authController.verifyEmail);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: michael@example.com
 *               password:
 *                 type: string
 *                 example: Secret123
 *               rememberMe:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Login successful, tokens set in cookies
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified or account suspended
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and clear auth cookies
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: michael@example.com
 *     responses:
 *       200:
 *         description: Reset email sent if account exists
 */
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password with token from email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, confirmPassword]
 *             properties:
 *               password:
 *                 type: string
 *                 example: NewSecret123
 *               confirmPassword:
 *                 type: string
 *                 example: NewSecret123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password/:token', validate(resetPasswordSchema), authController.resetPassword);

export default router;
