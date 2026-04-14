import { z } from 'zod';

export const topupNairaSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .min(100, 'Minimum top-up is ₦100')
      .max(10000000, 'Maximum top-up is ₦10,000,000'),
  }),
});

export const topupCryptoSchema = z.object({
  body: z.object({
    amount: z.number({ required_error: 'Amount is required' }).min(1, 'Minimum top-up is $1'),
    currency: z.string().toLowerCase().default('usdt'),
  }),
});

export const withdrawSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .min(500, 'Minimum withdrawal is ₦500'),
    bankCode: z.string().min(1, 'Bank code is required'),
    accountNumber: z
      .string()
      .length(10, 'Account number must be exactly 10 digits')
      .regex(/^\d+$/, 'Account number must contain only digits'),
    narration: z.string().max(100).optional().default('TrendFuel withdrawal'),
  }),
});

export const verifyBankSchema = z.object({
  body: z.object({
    bankCode: z.string().min(1, 'Bank code is required'),
    accountNumber: z
      .string()
      .length(10, 'Account number must be exactly 10 digits')
      .regex(/^\d+$/, 'Account number must contain only digits'),
  }),
});

export const getTransactionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
    type: z
      .enum([
        'topup',
        'order_debit',
        'escrow_release',
        'withdrawal',
        'refund',
        'commission',
        'referral_bonus',
        'promo',
        'seller_access_fee',
      ])
      .optional(),
  }),
});

export type TopupNairaInput = z.infer<typeof topupNairaSchema>['body'];
export type TopupCryptoInput = z.infer<typeof topupCryptoSchema>['body'];
export type WithdrawInput = z.infer<typeof withdrawSchema>['body'];
export type VerifyBankInput = z.infer<typeof verifyBankSchema>['body'];
export type GetTransactionsQuery = z.infer<typeof getTransactionsSchema>['query'];
