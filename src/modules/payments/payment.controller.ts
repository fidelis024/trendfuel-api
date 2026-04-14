import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as paymentService from './payment.service';

// POST /api/v1/payments/topup/naira
export const initiateNairaTopup = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await paymentService.initiateNairaTopup(req.user._id.toString(), req.body);
  res.status(200).json(new ApiResponse(200, 'Payment account created successfully', result));
});

// POST /api/v1/payments/topup/crypto
export const initiateCryptoTopup = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await paymentService.initiateCryptoTopup(req.user._id.toString(), req.body);
  res.status(200).json(new ApiResponse(200, 'Crypto payment created successfully', result));
});

// POST /api/v1/payments/webhook/xixapay — public, no auth (Xixapay calls this)
export const xixapayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['xixapay'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'Missing signature header' });
  }

  // Use raw body string for signature verification
  const rawBody = JSON.stringify(req.body);
  await paymentService.handleXixapayWebhook(rawBody, signature);

  // Always return 200 to Xixapay so they don't retry
  res.status(200).json({ status: 'ok' });
});

// POST /api/v1/payments/webhook/nowpayments — public, no auth
export const nowPaymentsWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-nowpayments-sig'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'Missing signature header' });
  }

  const rawBody = JSON.stringify(req.body);
  await paymentService.handleNowPaymentsWebhook(rawBody, signature);

  res.status(200).json({ status: 'ok' });
});

// POST /api/v1/payments/withdraw
export const requestWithdrawal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const result = await paymentService.requestWithdrawal(req.user._id.toString(), req.body);
  res.status(200).json(new ApiResponse(200, 'Withdrawal processed successfully', result));
});

// POST /api/v1/payments/verify-bank
export const verifyBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.verifyBankAccount(req.body);
  res.status(200).json(new ApiResponse(200, 'Bank account verified', result));
});

// GET /api/v1/payments/banks
export const getSupportedBanks = asyncHandler(async (_req: Request, res: Response) => {
  const banks = await paymentService.getSupportedBanks();
  res.status(200).json(new ApiResponse(200, 'Banks fetched successfully', banks));
});

// GET /api/v1/payments/wallet
export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  const wallet = await paymentService.getWallet(req.user._id.toString());
  res.status(200).json(new ApiResponse(200, 'Wallet fetched successfully', wallet));
});

// GET /api/v1/payments/transactions
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
