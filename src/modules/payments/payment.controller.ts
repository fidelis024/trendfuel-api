import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as paymentService from './payment.service';

// ─── Withdrawal Wallet ────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/withdrawal-wallet
 * Returns the seller's saved USDT TRC20 withdrawal wallet address.
 */
export const getWithdrawalWallet = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await paymentService.getWithdrawalWallet(req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Withdrawal wallet fetched successfully', result));
});

/**
 * POST /api/v1/payments/withdrawal-wallet
 * Set or update the seller's USDT TRC20 withdrawal wallet address.
 * Requires password confirmation.
 */
export const setWithdrawalWallet = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await paymentService.setWithdrawalWallet(req.user._id.toString(), req.body);
  res
    .status(200)
    .json(new ApiResponse(200, 'Withdrawal wallet address saved successfully', result));
});

// ─── Top-up ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/topup
 * Initiate a USDT (TRC20) top-up via NOWPayments.
 */
export const initiateCryptoTopup = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await paymentService.initiateCryptoTopup(req.user._id.toString(), req.body);
  res.status(200).json(new ApiResponse(200, 'Payment address created successfully', result));
});

// ─── NOWPayments Webhook ──────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/webhook/nowpayments
 * Public — called by NOWPayments when a payment is confirmed.
 */
export const nowPaymentsWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-nowpayments-sig'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'Missing signature header' });
  }
  const rawBody = JSON.stringify(req.body);
  await paymentService.handleNowPaymentsWebhook(rawBody, signature);
  res.status(200).json({ status: 'ok' });
});

// ─── Withdrawal ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/withdraw
 * Seller requests a USDT withdrawal.
 * Deducts clearedBalance immediately; admin manually sends the USDT and marks it sent.
 */
export const requestWithdrawal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await paymentService.requestWithdrawal(req.user._id.toString(), req.body);
  res.status(200).json(new ApiResponse(200, 'Withdrawal request submitted successfully', result));
});

// ─── Wallet ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/wallet
 */
export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const wallet = await paymentService.getWallet(req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Wallet fetched successfully', wallet));
});

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/transactions
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const { transactions, pagination } = await paymentService.getTransactions(
    req.user._id.toString(),
    req.query as any
  );
  res
    .status(200)
    .json(new ApiResponse(200, 'Transactions fetched successfully', { transactions, pagination }));
});