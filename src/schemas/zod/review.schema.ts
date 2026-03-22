import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    rating: z
      .number({ required_error: 'Rating is required' })
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must be at most 5')
      .int('Rating must be a whole number'),
    comment: z
      .string()
      .min(10, 'Comment must be at least 10 characters')
      .max(1000, 'Comment must be at most 1000 characters'),
  }),
});

export const getReviewsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
  }),
});

export const reviewIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Review ID is required'),
  }),
});

export const sellerIdParamSchema = z.object({
  params: z.object({
    sellerId: z.string().min(1, 'Seller ID is required'),
  }),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];
export type GetReviewsQuery = z.infer<typeof getReviewsSchema>['query'];
