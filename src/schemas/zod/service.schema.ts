import { z } from 'zod';

export const createServiceSchema = z.object({
  body: z
    .object({
      categoryId: z.string().min(1, 'Category is required'),
      title: z
        .string()
        .min(5, 'Title must be at least 5 characters')
        .max(120, 'Title must be at most 120 characters')
        .trim(),
      description: z
        .string()
        .min(20, 'Description must be at least 20 characters')
        .max(2000, 'Description must be at most 2000 characters'),
      pricePerUnit: z
        .number({ required_error: 'Price is required' })
        .min(1, 'Price must be at least 1 cent'),
      minQty: z
        .number({ required_error: 'Minimum quantity is required' })
        .min(1, 'Minimum quantity must be at least 1'),
      maxQty: z
        .number({ required_error: 'Maximum quantity is required' })
        .min(1, 'Maximum quantity must be at least 1'),
      deliveryHours: z
        .number({ required_error: 'Delivery time is required' })
        .min(1, 'Delivery time must be at least 1 hour'),
      refillPolicy: z
        .object({
          offered: z.boolean().default(false),
          windowDays: z.number().min(0).default(0),
          conditions: z.string().max(500).default(''),
        })
        .optional(),
      tags: z
        .array(z.string().trim().toLowerCase())
        .max(10, 'Maximum 10 tags allowed')
        .optional()
        .default([]),
    })
    .refine((data) => data.maxQty >= data.minQty, {
      message: 'Maximum quantity must be greater than or equal to minimum quantity',
      path: ['maxQty'],
    }),
});

export const updateServiceSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Service ID is required'),
  }),
  body: z
    .object({
      title: z.string().min(5).max(120).trim().optional(),
      description: z.string().min(20).max(2000).optional(),
      pricePerUnit: z.number().min(1).optional(),
      minQty: z.number().min(1).optional(),
      maxQty: z.number().min(1).optional(),
      deliveryHours: z.number().min(1).optional(),
      refillPolicy: z
        .object({
          offered: z.boolean(),
          windowDays: z.number().min(0),
          conditions: z.string().max(500),
        })
        .optional(),
      tags: z.array(z.string().trim().toLowerCase()).max(10).optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (data.minQty && data.maxQty) return data.maxQty >= data.minQty;
        return true;
      },
      {
        message: 'Maximum quantity must be greater than or equal to minimum quantity',
        path: ['maxQty'],
      }
    ),
});

export const getServicesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
    category: z.string().optional(),
    platform: z.string().optional(),
    search: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z
      .enum(['rankScore', 'pricePerUnit', 'createdAt', 'stats.avgRating'])
      .default('rankScore'),
    order: z.enum(['asc', 'desc']).default('desc'),
    featured: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
  }),
});

export const serviceIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Service ID is required'),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    platform: z.enum([
      'instagram',
      'tiktok',
      'youtube',
      'x',
      'facebook',
      'linkedin',
      'snapchat',
      'spotify',
      'telegram',
      'other',
    ]),
    name: z.string().min(2).max(80).trim(),
    slug: z
      .string()
      .min(2)
      .max(80)
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  }),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>['body'];
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>['body'];
export type GetServicesQuery = z.infer<typeof getServicesSchema>['query'];
export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
