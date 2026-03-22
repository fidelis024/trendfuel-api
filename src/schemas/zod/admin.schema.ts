import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['active', 'suspended', 'banned']),
    reason: z.string().max(500).optional(),
  }),
});

export const sellerApplicationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    action: z.enum(['approve', 'reject']),
    reason: z.string().max(500).optional(),
  }),
});

export const featureServiceSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    isFeatured: z.boolean(),
  }),
});

export const getUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    role: z.enum(['admin', 'buyer', 'seller']).optional(),
    status: z.enum(['active', 'suspended', 'banned', 'pending']).optional(),
    search: z.string().optional(),
  }),
});

export const getAdminOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    status: z
      .enum([
        'pending',
        'processing',
        'delivered',
        'completed',
        'disputed',
        'cancelled',
        'refunded',
      ])
      .optional(),
  }),
});

export const analyticsSchema = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  }),
});

export const announcementSchema = z.object({
  body: z.object({
    subject: z.string().min(3).max(150),
    message: z.string().min(10).max(3000),
    targetRole: z.enum(['all', 'buyer', 'seller']).default('all'),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const serviceIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>['body'];
export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>['body'];
export type FeatureServiceInput = z.infer<typeof featureServiceSchema>['body'];
export type GetUsersQuery = z.infer<typeof getUsersSchema>['query'];
export type AnalyticsQuery = z.infer<typeof analyticsSchema>['query'];
export type AnnouncementInput = z.infer<typeof announcementSchema>['body'];
