import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import {
  topupCryptoSchema,
  withdrawSchema,
  getTransactionsSchema,
  setWithdrawalWalletSchema,
} from '../../schemas/zod/payment.schema';
import * as paymentController from './payment.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Wallet, USDT top-up, and withdrawal endpoints
 */

// ─── Webhooks (public — NOWPayments calls these, no auth required) ─────────────

/**
 * @swagger
 * /payments/webhook/nowpayments:
 *   post:
 *     summary: NOWPayments USDT webhook (called by NOWPayments, not the frontend)
 *     tags: [Payments]
 *     description: |
 *       Called automatically by NOWPayments when a USDT payment is confirmed or finished.
 *       Signature is verified via HMAC-SHA512 using the IPN secret.
 *       **Do not call this endpoint manually.**
 *     responses:
 *       200:
 *         description: Webhook received and processed
 */
router.post('/webhook/nowpayments', paymentController.nowPaymentsWebhook);

// ─── Authenticated endpoints ───────────────────────────────────────────────────

/**
 * @swagger
 * /payments/wallet:
 *   get:
 *     summary: Get current user's wallet balance
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns wallet balances.
 *
 *       **For buyers:** `balance` (spendable, in cents USD × 100)
 *
 *       **For sellers:**
 *       - `pendingBalance` — funds in escrow, not yet released
 *       - `clearedBalance` — withdrawable earnings
 *       - `lifetimeEarnings` — total earned since joining
 *     responses:
 *       200:
 *         description: Wallet details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: integer
 *                   description: Buyer spendable balance in cents (divide by 100 for USD)
 *                   example: 5000
 *                 pendingBalance:
 *                   type: integer
 *                   description: Seller balance locked in escrow
 *                   example: 2000
 *                 clearedBalance:
 *                   type: integer
 *                   description: Seller withdrawable balance in cents
 *                   example: 15000
 */
router.get('/wallet', authenticate, paymentController.getWallet);

/**
 * @swagger
 * /payments/transactions:
 *   get:
 *     summary: Get current user's transaction history (paginated)
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
 *           enum: [topup, order_debit, escrow_release, withdrawal, refund, commission, seller_registration_fee]
 *     responses:
 *       200:
 *         description: Paginated transaction list
 */
router.get(
  '/transactions',
  authenticate,
  validate(getTransactionsSchema),
  paymentController.getTransactions
);

/**
 * @swagger
 * /payments/topup:
 *   post:
 *     summary: Initiate a USDT (TRC20) wallet top-up via NOWPayments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Creates a USDT TRC20 payment address via NOWPayments.
 *       The user sends the exact USDT amount to the returned address.
 *       The wallet is credited automatically once NOWPayments confirms the payment.
 *
 *       **Minimum top-up:** $10 USDT
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
 *                 description: Amount in USD (minimum $10)
 *                 example: 50
 *     responses:
 *       200:
 *         description: USDT payment address created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentId:
 *                   type: string
 *                   example: "5585955881"
 *                 payAddress:
 *                   type: string
 *                   example: "TRX_ADDRESS_HERE"
 *                 payAmount:
 *                   type: number
 *                   example: 50.0
 *                 payCurrency:
 *                   type: string
 *                   example: "USDT (TRC20)"
 *                 network:
 *                   type: string
 *                   example: "TRC20 (Tron)"
 *                 amountUsd:
 *                   type: number
 *                   example: 50
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 reference:
 *                   type: string
 *                 instruction:
 *                   type: string
 *       400:
 *         description: Amount below minimum ($10)
 */
router.post(
  '/topup',
  authenticate,
  validate(topupCryptoSchema),
  paymentController.initiateCryptoTopup
);

/**
 * @swagger
 * /payments/withdrawal-wallet:
 *   get:
 *     summary: Get saved USDT withdrawal wallet address (seller only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns the seller's saved USDT TRC20 withdrawal wallet address.
 *       Returns `{ address: null }` if no address has been set yet.
 *     responses:
 *       200:
 *         description: Withdrawal wallet details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                   nullable: true
 *                   example: "TYourTRC20WalletAddressHere"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 */
router.get(
  '/withdrawal-wallet',
  authenticate,
  authorize('seller', 'admin', 'super_admin'),
  paymentController.getWithdrawalWallet
);

/**
 * @swagger
 * /payments/withdrawal-wallet:
 *   post:
 *     summary: Set or update USDT withdrawal wallet address (seller only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Saves or updates the seller's USDT TRC20 wallet address for withdrawals.
 *
 *       **Password confirmation is required** to protect against unauthorized address changes.
 *
 *       The address must be a valid TRC20 address (starts with `T`, 34 characters).
 *
 *       Calling this again with a new address overwrites the existing one.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [address, password]
 *             properties:
 *               address:
 *                 type: string
 *                 description: USDT TRC20 wallet address (starts with T, 34 chars)
 *                 example: "TYourTRC20WalletAddressHere"
 *               password:
 *                 type: string
 *                 description: Current account password (required for security)
 *                 example: "mySecurePassword123"
 *     responses:
 *       200:
 *         description: Wallet address saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                   example: "TYourTRC20WalletAddressHere"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid TRC20 address format
 *       401:
 *         description: Incorrect password
 */
router.post(
  '/withdrawal-wallet',
  authenticate,
  authorize('seller', 'admin', 'super_admin'),
  validate(setWithdrawalWalletSchema),
  paymentController.setWithdrawalWallet
);

/**
 * @swagger
 * /payments/withdraw:
 *   post:
 *     summary: Request a USDT withdrawal (seller only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Submits a withdrawal request.
 *
 *       **How it works:**
 *       1. The requested amount is immediately deducted from the seller's `clearedBalance`
 *       2. A `withdrawal` transaction is created with status `pending`
 *       3. An admin reviews and manually sends the USDT to the seller's saved TRC20 address
 *       4. Admin marks the withdrawal as sent → seller receives an email confirmation
 *
 *       **Prerequisites:**
 *       - A USDT TRC20 withdrawal wallet address must be saved (`POST /payments/withdrawal-wallet`)
 *       - Account must be at least 7 days old (configurable)
 *       - Sufficient `clearedBalance`
 *
 *       **Fee:** 3% deducted from the requested amount. Net amount is sent to the wallet.
 *
 *       **Minimum withdrawal:** $10 USDT
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
 *                 description: Amount in USD (minimum $10)
 *                 example: 100
 *     responses:
 *       200:
 *         description: Withdrawal request submitted — awaiting admin processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reference:
 *                   type: string
 *                   example: "withdrawal-userId-uuid"
 *                 amountRequested:
 *                   type: number
 *                   example: 100
 *                 withdrawalFee:
 *                   type: number
 *                   description: 3% fee deducted
 *                   example: 3
 *                 netPayout:
 *                   type: number
 *                   description: Amount admin will send to wallet
 *                   example: 97
 *                 walletAddress:
 *                   type: string
 *                   example: "TYourTRC20WalletAddressHere"
 *                 network:
 *                   type: string
 *                   example: "TRC20 (Tron)"
 *                 status:
 *                   type: string
 *                   example: "pending"
 *                 message:
 *                   type: string
 *       400:
 *         description: No wallet address set, insufficient balance, or withdrawal delay active
 */
router.post(
  '/withdraw',
  authenticate,
  authorize('seller', 'admin', 'super_admin'),
  validate(withdrawSchema),
  paymentController.requestWithdrawal
);

export default router;