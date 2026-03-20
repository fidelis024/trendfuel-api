// sellers/seller.validator.ts
import { z } from 'zod';

export const createSellerSchema = z.object({
  businessName: z.string().min(3, 'Business name must be at least 3 characters'),
  businessDescription: z.string().optional(),
});

export type CreateSellerInput = z.infer<typeof createSellerSchema>;
