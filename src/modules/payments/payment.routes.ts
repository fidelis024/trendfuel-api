import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  topupNairaSchema,
  topupCryptoSchema,
  withdrawSchema,
  verifyBankSchema,
  getTransactionsSchema,
} from '../../schemas/zod/payment.schema';
import * as paymentController from './payment.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Wallet, top-up and withdrawal endpoints
 */

// ─── Webhooks (public — no auth, Xixapay/NOWPayments call these) ──────────────

/**
 * @swagger
 * /payments/webhook/xixapay:
 *   post:
 *     summary: Xixapay payment webhook (called by Xixapay, not by frontend)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhook/xixapay', paymentController.xixapayWebhook);

/**
 * @swagger
 * /payments/webhook/nowpayments:
 *   post:
 *     summary: NOWPayments crypto webhook (called by NOWPayments, not by frontend)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhook/nowpayments', paymentController.nowPaymentsWebhook);

// ─── Public endpoints ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /payments/banks:
 *   get:
 *     summary: Get list of supported Nigerian banks for withdrawal
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: List of banks with codes
 */
router.get('/banks', paymentController.getSupportedBanks);

/**
 * @swagger
 * /payments/verify-bank:
 *   post:
 *     summary: Verify a Nigerian bank account before withdrawal
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bankCode, accountNumber]
 *             properties:
 *               bankCode:
 *                 type: string
 *                 example: "058"
 *               accountNumber:
 *                 type: string
 *                 example: "0123456789"
 *     responses:
 *       200:
 *         description: Account name and bank verified
 *       400:
 *         description: Invalid account details
 */
router.post('/verify-bank', validate(verifyBankSchema), paymentController.verifyBankAccount);

// ─── Authenticated endpoints ───────────────────────────────────────────────────

/**
 * @swagger
 * /payments/wallet:
 *   get:
 *     summary: Get current user's wallet balance
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet with balance, pendingBalance, clearedBalance
 */
router.get('/wallet', authenticate, paymentController.getWallet);

/**
 * @swagger
 * /payments/transactions:
 *   get:
 *     summary: Get current user's transaction history
 *     tags: [Payments]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [topup, order_debit, escrow_release, withdrawal, refund, commission]
 *     responses:
 *       200:
 *         description: Paginated transaction history
 */
router.get(
  '/transactions',
  authenticate,
  validate(getTransactionsSchema),
  paymentController.getTransactions
);

/**
 * @swagger
 * /payments/topup/naira:
 *   post:
 *     summary: Initiate a Naira top-up via bank transfer (Xixapay)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in NGN (minimum ₦100)
 *                 example: 5000
 *     responses:
 *       200:
 *         description: |
 *           Returns dynamic virtual account details:
 *           - bankName, accountNumber, accountName
 *           - amount to transfer
 *           - instruction message
 *           Buyer transfers to this account. Wallet is credited automatically via webhook.
 */
router.post(
  '/topup/naira',
  authenticate,
  authorize('buyer', 'seller', 'admin', 'super_admin'),
  validate(topupNairaSchema),
  paymentController.initiateNairaTopup
);

/**
 * @swagger
 * /payments/topup/crypto:
 *   post:
 *     summary: Initiate a crypto top-up via NOWPayments (USDT default)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in USD
 *                 example: 10
 *               currency:
 *                 type: string
 *                 description: Crypto currency to pay with
 *                 default: usdt
 *                 example: usdt
 *     responses:
 *       200:
 *         description: |
 *           Returns crypto payment details:
 *           - payAddress, payAmount, payCurrency
 *           - expiresAt, reference
 *           Buyer sends crypto to payAddress. Wallet credited automatically via webhook.
 */
router.post(
  '/topup/crypto',
  authenticate,
  authorize('buyer', 'seller', 'admin', 'super_admin'),
  validate(topupCryptoSchema),
  paymentController.initiateCryptoTopup
);

/**
 * @swagger
 * /payments/withdraw:
 *   post:
 *     summary: Request a withdrawal to a Nigerian bank account (seller only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, bankCode, accountNumber]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in NGN (minimum ₦500)
 *                 example: 10000
 *               bankCode:
 *                 type: string
 *                 description: Bank code from /payments/banks
 *                 example: "058"
 *               accountNumber:
 *                 type: string
 *                 example: "0123456789"
 *               narration:
 *                 type: string
 *                 example: TrendFuel earnings withdrawal
 *     responses:
 *       200:
 *         description: Withdrawal initiated — 3% fee deducted, net amount sent to bank
 *       400:
 *         description: Insufficient balance or withdrawal delay active
 */
router.post(
  '/withdraw',
  authenticate,
  authorize('seller', 'admin', 'super_admin'),
  validate(withdrawSchema),
  paymentController.requestWithdrawal
);

export default router;
