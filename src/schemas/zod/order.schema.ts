// orders/order.validator.ts
import { z } from 'zod';

export const createOrderSchema = z.object({
  sellerId: z.string(),
  serviceId: z.string(),
  amount: z.number().positive(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
