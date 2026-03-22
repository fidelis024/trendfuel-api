import { z } from 'zod';

export const openDisputeSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    reason: z.string().min(5, 'Reason must be at least 5 characters').max(200),
    buyerStatement: z
      .string()
      .min(20, 'Please provide more detail (at least 20 characters)')
      .max(2000),
  }),
});

export const sellerRespondSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Dispute ID is required'),
  }),
  body: z.object({
    sellerResponse: z
      .string()
      .min(20, 'Please provide more detail (at least 20 characters)')
      .max(2000),
  }),
});

export const resolveDisputeSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Dispute ID is required'),
  }),
  body: z.object({
    resolution: z.enum(['refund_full', 'refund_partial', 'no_refund']),
    refundAmount: z.number().min(0).optional().default(0),
    sellerPenalty: z
      .enum(['warning', 'ranking_drop', 'suspension', 'ban', 'none'])
      .optional()
      .default('none'),
    adminNote: z.string().max(1000).optional(),
  }),
});

export const getDisputesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
    status: z.enum(['open', 'seller_responded', 'under_review', 'resolved']).optional(),
  }),
});

export const disputeIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Dispute ID is required'),
  }),
});

export type OpenDisputeInput = z.infer<typeof openDisputeSchema>['body'];
export type SellerRespondInput = z.infer<typeof sellerRespondSchema>['body'];
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>['body'];
export type GetDisputesQuery = z.infer<typeof getDisputesSchema>['query'];
