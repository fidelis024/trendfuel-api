import { z } from 'zod';

export const twoFactorSetupSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const twoFactorVerifySchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits'),
});

export type TwoFactorSetupInput = z.infer<typeof twoFactorSetupSchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
