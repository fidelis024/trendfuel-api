import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
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
  TopupNairaInput,
  TopupCryptoInput,
  WithdrawInput,
  VerifyBankInput,
  GetTransactionsQuery,
} from '../../schemas/zod/payment.schema';

// ─── Xixapay axios client ─────────────────────────────────────────────────────

const xixapay = axios.create({
  baseURL: 'https://api.xixapay.com/api',
  headers: {
    'Content-Type': 'application/json',
    'api-key': env.XIXAPAY_API_KEY,
    Authorization: `Bearer ${env.XIXAPAY_SECRET_KEY}`,
  },
});

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

// ─── Top-up via Xixapay (Naira) ───────────────────────────────────────────────
// Creates a dynamic virtual account for this specific top-up amount.
// Buyer transfers money to returned account → Xixapay fires webhook → wallet credited.

export const initiateNairaTopup = async (userId: string, data: TopupNairaInput) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const response = await xixapay.post('/v1/createVirtualAccount', {
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    phoneNumber: '00000000000', // placeholder — dynamic accounts don't require phone
    bankCode: ['20867'], // Palmpay — fastest settlement
    businessId: env.XIXAPAY_BUSINESS_ID,
    accountType: 'dynamic',
    amount: data.amount,
  });

  if (response.data?.status !== 'success') {
    throw ApiError.internal('Failed to create payment account. Please try again.');
  }

  const bankAccounts = response.data.bankAccounts;
  if (!bankAccounts || bankAccounts.length === 0) {
    throw ApiError.internal('No bank account returned from payment provider.');
  }

  const account = bankAccounts[0];

  return {
    amount: data.amount,
    currency: 'NGN',
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
    expiresIn: '30 minutes',
    instruction: `Transfer exactly ₦${data.amount.toLocaleString()} to the account above. Your wallet will be credited automatically.`,
  };
};

// ─── Xixapay Webhook Handler ──────────────────────────────────────────────────
// Verifies HMAC-SHA256 signature from 'xixapay' header, then credits buyer wallet.

export const handleXixapayWebhook = async (rawBody: string, signature: string): Promise<void> => {
  // Verify signature
  const computed = crypto
    .createHmac('sha256', env.XIXAPAY_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  if (computed !== signature) {
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const payload = JSON.parse(rawBody);

  if (payload.notification_status !== 'payment_successful') {
    // Not a successful payment — acknowledge but do nothing
    return;
  }

  const { amount_paid, customer } = payload;
  if (!customer?.customer_id && !customer?.email) {
    throw ApiError.badRequest('No customer identifier in webhook payload');
  }

  // Find user by email from webhook payload
  const user = await User.findOne({ email: customer.email });
  if (!user) {
    console.error(`Xixapay webhook: no user found for email ${customer.email}`);
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await ensureWallet(user._id.toString(), WalletType.BUYER, session);

    // Idempotency — check if this transaction_id was already processed
    const existing = await Transaction.findOne({
      reference: `xixapay-${payload.transaction_id}`,
    }).session(session);

    if (existing) {
      await session.abortTransaction();
      return; // already processed, safe to ignore
    }

    // Credit wallet — convert NGN to platform cents (store as NGN kobo)
    const amountInKobo = Math.round(amount_paid * 100);
    wallet.balance += amountInKobo;
    await wallet.save({ session });

    // Log transaction
    await Transaction.create(
      [
        {
          walletId: wallet._id,
          userId: user._id,
          type: TransactionType.TOPUP,
          amount: amountInKobo,
          direction: TransactionDirection.CREDIT,
          status: TransactionStatus.COMPLETED,
          reference: `xixapay-${payload.transaction_id}`,
          gateway: PaymentGateway.BANK,
          gatewayMeta: payload,
          description: `Wallet top-up via bank transfer — ₦${amount_paid.toLocaleString()}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    console.info(`Wallet credited ₦${amount_paid} for user ${user.email}`);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Top-up via NOWPayments (Crypto) ─────────────────────────────────────────
// Creates a crypto payment invoice. Buyer pays in USDT → webhook credits wallet.

export const initiateCryptoTopup = async (userId: string, data: TopupCryptoInput) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const reference = `trendfuel-topup-${userId}-${uuidv4()}`;

  const response = await nowpayments.post('/payment', {
    price_amount: data.amount,
    price_currency: 'usd',
    pay_currency: data.currency,
    order_id: reference,
    order_description: `TrendFuel wallet top-up — $${data.amount}`,
    ipn_callback_url: `${env.API_URL}/api/v1/payments/webhook/nowpayments`,
  });

  if (!response.data?.payment_id) {
    throw ApiError.internal('Failed to create crypto payment. Please try again.');
  }

  return {
    paymentId: response.data.payment_id,
    payAddress: response.data.pay_address,
    payAmount: response.data.pay_amount,
    payCurrency: response.data.pay_currency,
    amountUsd: data.amount,
    expiresAt: response.data.expiration_estimate_date,
    reference,
    instruction: `Send exactly ${response.data.pay_amount} ${response.data.pay_currency.toUpperCase()} to the address above. Your wallet will be credited in USD after confirmation.`,
  };
};

// ─── NOWPayments Webhook Handler ──────────────────────────────────────────────

export const handleNowPaymentsWebhook = async (
  rawBody: string,
  signature: string
): Promise<void> => {
  // Verify HMAC-SHA512 signature
  const computed = crypto
    .createHmac('sha512', env.NOWPAYMENTS_IPN_SECRET)
    .update(rawBody)
    .digest('hex');

  if (computed !== signature) {
    throw ApiError.unauthorized('Invalid NOWPayments webhook signature');
  }

  const payload = JSON.parse(rawBody);

  // Only process confirmed/finished payments
  if (!['confirmed', 'finished'].includes(payload.payment_status)) {
    return;
  }

  // Extract userId from order_id: "trendfuel-topup-{userId}-{uuid}"
  const parts = payload.order_id?.split('-');
  if (!parts || parts.length < 3) return;
  const userId = parts[2];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await ensureWallet(userId, WalletType.BUYER, session);

    // Idempotency check
    const existing = await Transaction.findOne({
      reference: `nowpayments-${payload.payment_id}`,
    }).session(session);

    if (existing) {
      await session.abortTransaction();
      return;
    }

    // Store in USD cents
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
          description: `Wallet top-up via crypto — $${payload.price_amount}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Withdrawal Request ───────────────────────────────────────────────────────

export const requestWithdrawal = async (userId: string, data: WithdrawInput) => {
  const config = await getConfig();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw ApiError.badRequest('Wallet not found');

    // Convert amount to kobo for comparison
    const amountInKobo = data.amount * 100;
    const withdrawalFee = Math.round(amountInKobo * config.withdrawalFeeRate);
    const netAmount = amountInKobo - withdrawalFee;

    if (wallet.clearedBalance < amountInKobo) {
      throw ApiError.badRequest(
        `Insufficient balance. Available: ₦${(wallet.clearedBalance / 100).toFixed(2)}`
      );
    }

    // Check withdrawal delay for new sellers
    const user = await User.findById(userId).session(session);
    if (user && user.sellerMetrics) {
      const daysSinceJoined =
        (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceJoined < config.withdrawalDelayDays) {
        throw ApiError.badRequest(
          `New sellers must wait ${config.withdrawalDelayDays} days before withdrawing. ` +
            `${Math.ceil(config.withdrawalDelayDays - daysSinceJoined)} day(s) remaining.`
        );
      }
    }

    // Deduct from cleared balance
    wallet.clearedBalance -= amountInKobo;
    await wallet.save({ session });

    const reference = `withdrawal-${userId}-${uuidv4()}`;

    // Log pending withdrawal transaction
    await Transaction.create(
      [
        {
          walletId: wallet._id,
          userId: new mongoose.Types.ObjectId(userId),
          type: TransactionType.WITHDRAWAL,
          amount: amountInKobo,
          direction: TransactionDirection.DEBIT,
          status: TransactionStatus.PENDING,
          reference,
          gateway: PaymentGateway.BANK,
          gatewayMeta: {
            bankCode: data.bankCode,
            accountNumber: data.accountNumber,
            narration: data.narration,
            withdrawalFee,
            netAmount,
          },
          description: `Withdrawal request — ₦${data.amount.toLocaleString()}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Initiate actual payout via Xixapay
    try {
      const payoutResponse = await xixapay.post('/v1/transfer', {
        businessId: env.XIXAPAY_BUSINESS_ID,
        amount: netAmount / 100, // convert kobo back to NGN
        bank: data.bankCode,
        accountNumber: data.accountNumber,
        narration: data.narration ?? 'TrendFuel withdrawal',
      });

      // Update transaction with gateway response
      await Transaction.findOneAndUpdate(
        { reference },
        {
          status:
            payoutResponse.data?.status === 'success'
              ? TransactionStatus.COMPLETED
              : TransactionStatus.FAILED,
          'gatewayMeta.payoutResponse': payoutResponse.data,
        }
      );

      if (payoutResponse.data?.status !== 'success') {
        // Refund if payout failed
        await Wallet.findOneAndUpdate({ userId }, { $inc: { clearedBalance: amountInKobo } });
        throw ApiError.internal('Payout failed. Your balance has been restored.');
      }
    } catch (payoutErr: any) {
      // Refund on payout error
      await Wallet.findOneAndUpdate({ userId }, { $inc: { clearedBalance: amountInKobo } });
      await Transaction.findOneAndUpdate({ reference }, { status: TransactionStatus.FAILED });
      throw ApiError.internal(
        payoutErr?.response?.data?.message ?? 'Payout failed. Your balance has been restored.'
      );
    }

    return {
      reference,
      amountRequested: data.amount,
      withdrawalFee: withdrawalFee / 100,
      netPayout: netAmount / 100,
      bankCode: data.bankCode,
      accountNumber: data.accountNumber,
      status: 'processing',
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Verify Bank Account ──────────────────────────────────────────────────────

export const verifyBankAccount = async (data: VerifyBankInput) => {
  const response = await xixapay.post('/verify/bank', {
    bank: data.bankCode,
    accountNumber: data.accountNumber,
  });

  if (response.data?.status !== 'success') {
    throw ApiError.badRequest('Could not verify bank account. Please check the details.');
  }

  return {
    accountName: response.data.AccountName,
    bankName: response.data.BankName,
    accountNumber: data.accountNumber,
    bankCode: data.bankCode,
  };
};

// ─── Get Supported Banks ──────────────────────────────────────────────────────

export const getSupportedBanks = async () => {
  const response = await xixapay.get('/get/banks');
  if (!response.data?.data) throw ApiError.internal('Failed to fetch banks list');
  return response.data.data;
};

// ─── Get Wallet ───────────────────────────────────────────────────────────────

export const getWallet = async (userId: string) => {
  const wallet = await ensureWallet(userId, WalletType.BUYER);
  return wallet;
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
