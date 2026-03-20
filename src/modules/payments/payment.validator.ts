// payments/payment.validator.ts
import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.string(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
