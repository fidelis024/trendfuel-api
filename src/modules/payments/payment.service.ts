import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Wallet, WalletType } from '../../schemas/mongoose/wallet.model';
import {
  Transaction,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  PaymentGateway,
} from '../../schemas/mongoose/transaction.model';
import { User } from '../../schemas/mongoose/user.model';
import { ApiError } from '../../utils/ApiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/paginate';
import { getConfig } from '../../config/platformconfig';
import env from '../../config/env';
import type {
  SetWithdrawalWalletInput,
  TopupCryptoInput,
  WithdrawInput,
  GetTransactionsQuery,
  AdminGetWithdrawalsQuery,
} from '../../schemas/zod/payment.schema';
import { withdrawalSentEmail } from '../../utils/email';
import { PlatformConfig } from '../../schemas/mongoose/platformconfig.model';

// ─── NOWPayments axios client ─────────────────────────────────────────────────

const nowpayments = axios.create({
  baseURL: 'https://api.nowpayments.io/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': env.NOWPAYMENTS_API_KEY,
  },
});

// ─── Ensure wallet exists ─────────────────────────────────────────────────────

const ensureWallet = async (userId: string, type: WalletType, session?: mongoose.ClientSession) => {
  const query = Wallet.findOne({ userId });
  if (session) query.session(session);
  let wallet = await query;

  if (!wallet) {
    const created = await Wallet.create(
      [{ userId: new mongoose.Types.ObjectId(userId), type }],
      session ? { session } : {}
    );
    wallet = created[0];
  }
  return wallet;
};

// ─── Set or Update Withdrawal Wallet Address ──────────────────────────────────

export const setWithdrawalWallet = async (userId: string, data: SetWithdrawalWalletInput) => {
  // Re-fetch user with passwordHash (select: false by default)
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) throw ApiError.unauthorized('Incorrect password');

  // Store address inside sellerProfile
  user.sellerProfile = {
    ...user.sellerProfile,
    withdrawalWallet: {
      address: data.address,
      updatedAt: new Date(),
    },
  } as any;

  await user.save();

  return {
    address: data.address,
    updatedAt: user.sellerProfile?.withdrawalWallet?.updatedAt,
  };
};

// ─── Get Withdrawal Wallet ────────────────────────────────────────────────────

export const getWithdrawalWallet = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const wallet = user.sellerProfile?.withdrawalWallet;
  if (!wallet?.address) {
    return { address: null, message: 'No withdrawal wallet set' };
  }

  return { address: wallet.address, updatedAt: wallet.updatedAt };
};

// ─── Top-up via NOWPayments (USDT TRC20 only) ────────────────────────────────

export const initiateCryptoTopup = async (userId: string, data: TopupCryptoInput) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const reference = `trendfuel-topup-${userId}-${uuidv4()}`;

  let response: any;
  try {
    response = await nowpayments.post('/payment', {
      price_amount: data.amount,
      price_currency: 'usd',
      pay_currency: 'usdttrc20',
      order_id: reference,
      order_description: `TrendFuel wallet top-up — $${data.amount} USDT`,
      ipn_callback_url: `${env.API_URL}/api/v1/payments/webhook/nowpayments`,
    });
  } catch (err: any) {
    const msg = err.response?.data?.message ?? 'Failed to create crypto payment';
    console.error('NOWPayments error:', err.response?.data);
    throw ApiError.internal(`Crypto payment failed: ${msg}`);
  }

  if (!response.data?.payment_id) {
    throw ApiError.internal('Failed to create payment. Please try again.');
  }

  return {
    paymentId: response.data.payment_id,
    payAddress: response.data.pay_address,
    payAmount: response.data.pay_amount,
    payCurrency: 'USDT (TRC20)',
    amountUsd: data.amount,
    network: 'TRC20 (Tron)',
    expiresAt: response.data.expiration_estimate_date,
    reference,
    instruction: `Send exactly ${response.data.pay_amount} USDT (TRC20) to the address above. Your TrendFuel wallet will be credited automatically after network confirmation.`,
  };
};

// ─── NOWPayments Webhook Handler ──────────────────────────────────────────────

export const handleNowPaymentsWebhook = async (
  rawBody: string,
  signature: string
): Promise<void> => {
  const computed = crypto
    .createHmac('sha512', env.NOWPAYMENTS_IPN_SECRET)
    .update(rawBody)
    .digest('hex');

  if (computed !== signature) {
    throw ApiError.unauthorized('Invalid NOWPayments webhook signature');
  }

  const payload = JSON.parse(rawBody);

  if (!['confirmed', 'finished'].includes(payload.payment_status)) {
    return; // Ignore non-final statuses
  }

  // Extract userId from order_id: "trendfuel-topup-{userId}-{uuid}"
  const parts = payload.order_id?.split('-');
  if (!parts || parts.length < 3) return;
  const userId = parts[2];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await ensureWallet(userId, WalletType.BUYER, session);

    // Idempotency guard — don't credit twice
    const existing = await Transaction.findOne({
      reference: `nowpayments-${payload.payment_id}`,
    }).session(session);

    if (existing) {
      await session.abortTransaction();
      return;
    }

    // Store in cents (USD × 100)
    const amountInCents = Math.round(payload.price_amount * 100);
    wallet.balance += amountInCents;
    await wallet.save({ session });

    await Transaction.create(
      [
        {
          walletId: wallet._id,
          userId: new mongoose.Types.ObjectId(userId),
          type: TransactionType.TOPUP,
          amount: amountInCents,
          direction: TransactionDirection.CREDIT,
          status: TransactionStatus.COMPLETED,
          reference: `nowpayments-${payload.payment_id}`,
          gateway: PaymentGateway.CRYPTO,
          gatewayMeta: payload,
          description: `Wallet top-up via USDT (TRC20) — $${payload.price_amount}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    console.info(`Wallet credited $${payload.price_amount} USDT for userId ${userId}`);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Request Withdrawal (Seller) ──────────────────────────────────────────────
// Manual flow: admin handles the actual USDT transfer.
// Deducts clearedBalance immediately, creates a PENDING transaction.
// Admin marks it as sent → seller gets an email.

export const requestWithdrawal = async (userId: string, data: WithdrawInput) => {
  const config = await getConfig();

  // Verify the seller has a withdrawal wallet set
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const walletAddress = user.sellerProfile?.withdrawalWallet?.address;
  if (!walletAddress) {
    throw ApiError.badRequest(
      'You must set a USDT (TRC20) withdrawal wallet address before requesting a withdrawal. ' +
        'Go to Settings → Withdrawal Wallet to add your address.'
    );
  }

  const COMMISSION_RATE = await PlatformConfig.findOne();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw ApiError.badRequest('Wallet not found');

    // All amounts in cents (USD × 100)
    let amountInCents = Math.round(data.amount * 100);
    const withdrawalFee = Math.round(amountInCents * (COMMISSION_RATE?.withdrawalFeeRate ?? 0.03)); // 3%
    const netAmount = amountInCents - withdrawalFee;

    amountInCents = data.amount; // For display purposes only; the fee is deducted in the transaction record, not from the wallet balance

    if (wallet.clearedBalance < amountInCents) {
      throw ApiError.badRequest(
        `Insufficient cleared balance. ` +
          `Available: $${(wallet.clearedBalance / 100).toFixed(2)} USDT`
      );
    }

    // Deduct immediately so seller can't double-withdraw
    wallet.clearedBalance -= amountInCents;
    await wallet.save({ session });

    const reference = `withdrawal-${userId}-${uuidv4()}`;

    await Transaction.create(
      [
        {
          walletId: wallet._id,
          userId: new mongoose.Types.ObjectId(userId),
          type: TransactionType.WITHDRAWAL,
          amount: amountInCents,
          direction: TransactionDirection.DEBIT,
          // Stays PENDING until admin manually marks it as sent
          status: TransactionStatus.PENDING,
          reference,
          gateway: PaymentGateway.CRYPTO,
          gatewayMeta: {
            walletAddress, // TRC20 address admin should send to
            network: 'TRC20',
            withdrawalFee: withdrawalFee / 100, // In USD
            netAmount: netAmount / 100, // In USD — this is what admin sends
            requestedAt: new Date().toISOString(),
          },
          description: `Withdrawal request — $${data.amount.toFixed(2)} USDT (TRC20)`,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      reference,
      amountRequested: data.amount,
      withdrawalFee: withdrawalFee / 100,
      netPayout: netAmount / 100,
      walletAddress,
      network: 'TRC20 (Tron)',
      status: 'pending',
      message:
        'Your withdrawal request has been received. The admin will process it shortly and you will receive an email once the USDT has been sent to your wallet.',
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Admin: Get All Withdrawal Requests ───────────────────────────────────────

export const adminGetWithdrawals = async (query: AdminGetWithdrawalsQuery) => {
  const { page, limit, status } = query;
  const { skip } = getPaginationOptions(page, limit);

  const filter: Record<string, unknown> = {
    type: TransactionType.WITHDRAWAL,
  };
  if (status) filter.status = status;

  const [withdrawals, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate({
      path: 'userId',
      select: 'firstName lastName email sellerProfile.withdrawalWallet',
    }),
    Transaction.countDocuments(filter),
  ]);

  return {
    withdrawals,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

// ─── Admin: Mark Withdrawal as Sent ──────────────────────────────────────────

export const adminMarkWithdrawalSent = async (
  transactionId: string,
  adminId: string
): Promise<void> => {
  const transaction = await Transaction.findById(transactionId).populate<{
    userId: {
      _id: mongoose.Types.ObjectId;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>('userId', 'firstName lastName email');

  if (!transaction) throw ApiError.notFound('Withdrawal transaction not found');
  if (transaction.type !== TransactionType.WITHDRAWAL) {
    throw ApiError.badRequest('Transaction is not a withdrawal');
  }
  if (transaction.status !== TransactionStatus.PENDING) {
    throw ApiError.badRequest(
      `Withdrawal is already ${transaction.status}. Only pending withdrawals can be marked as sent.`
    );
  }

  // Mark as completed
  transaction.status = TransactionStatus.COMPLETED;
  (transaction.gatewayMeta as any).markedSentBy = adminId;
  (transaction.gatewayMeta as any).markedSentAt = new Date().toISOString();
  transaction.markModified('gatewayMeta');
  await transaction.save();

  // Notify seller by email
  const seller = transaction.userId as {
    firstName: string;
    lastName: string;
    email: string;
  };

  const netAmountUsd = ((transaction.gatewayMeta as any).netAmount / 100).toFixed(2);
  const walletAddress = (transaction.gatewayMeta as any).walletAddress;
  const network = (transaction.gatewayMeta as any).network ?? 'TRC20';

  await withdrawalSentEmail(seller.email, seller.firstName, {
    reference: transaction.reference,
    netAmountUsd,
    walletAddress,
    network,
  });
};

// ─── Get Wallet ───────────────────────────────────────────────────────────────

export const getWallet = async (userId: string) => {
  return ensureWallet(userId, WalletType.BUYER);
};

// ─── Get Transaction History ──────────────────────────────────────────────────

export const getTransactions = async (userId: string, query: GetTransactionsQuery) => {
  const { page, limit, type } = query;
  const { skip } = getPaginationOptions(page, limit);

  const filter: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
  };
  if (type) filter.type = type;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return { transactions, pagination: buildPaginationMeta(total, page, limit) };
};
