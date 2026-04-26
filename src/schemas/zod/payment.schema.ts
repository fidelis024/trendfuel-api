import { z } from 'zod';

// ─── USDT TRC20 address validator ─────────────────────────────────────────────
// TRC20 addresses always start with 'T' and are 34 characters long (Base58)
const trc20AddressSchema = z
  .string()
  .regex(/^T[1-9A-HJ-NP-Za-km-z]{33}$/, 'Invalid USDT TRC20 wallet address');

// ─── Set / Edit withdrawal wallet address ────────────────────────────────────
export const setWithdrawalWalletSchema = z.object({
  body: z.object({
    address: trc20AddressSchema,
    password: z.string().min(1, 'Password is required to update withdrawal wallet'),
  }),
});

// ─── Top-up via USDT (NOWPayments) ───────────────────────────────────────────
export const topupCryptoSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .min(10, 'Minimum top-up is $10 USDT'),
  }),
});

// ─── Withdrawal request ───────────────────────────────────────────────────────
export const withdrawSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .min(10, 'Minimum withdrawal is $10 USDT'),
  }),
});

// ─── Get transactions (paginated + optional type filter) ─────────────────────
export const getTransactionsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 20)),
    type: z
      .enum([
        'topup',
        'order_debit',
        'escrow_release',
        'withdrawal',
        'refund',
        'commission',
        'seller_registration_fee',
      ])
      .optional(),
  }),
});

// ─── Admin: mark withdrawal as sent ──────────────────────────────────────────
export const adminMarkWithdrawalSentSchema = z.object({
  params: z.object({
    transactionId: z.string().min(1, 'Transaction ID is required'),
  }),
});

// ─── Admin: get all withdrawals (paginated + optional status filter) ──────────
export const adminGetWithdrawalsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 20)),
    status: z.enum(['pending', 'completed', 'failed']).optional(),
  }),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type SetWithdrawalWalletInput = z.infer<typeof setWithdrawalWalletSchema>['body'];
export type TopupCryptoInput = z.infer<typeof topupCryptoSchema>['body'];
export type WithdrawInput = z.infer<typeof withdrawSchema>['body'];
export type GetTransactionsQuery = z.infer<typeof getTransactionsSchema>['query'];
export type AdminGetWithdrawalsQuery = z.infer<typeof adminGetWithdrawalsSchema>['query'];