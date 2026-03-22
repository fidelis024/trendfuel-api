import { z } from 'zod';

export const placeOrderSchema = z.object({
  body: z.object({
    serviceId: z.string().min(1, 'Service ID is required'),
    quantity: z
      .number({ required_error: 'Quantity is required' })
      .min(1, 'Quantity must be at least 1'),
    buyerNote: z.string().max(500).optional(),
  }),
});

export const deliverOrderSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Order ID is required'),
  }),
  body: z.object({
    deliveryLink: z.string().min(1, 'Delivery proof is required').max(500),
  }),
});

export const orderIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Order ID is required'),
  }),
});

export const getOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
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

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>['body'];
export type DeliverOrderInput = z.infer<typeof deliverOrderSchema>['body'];
export type GetOrdersQuery = z.infer<typeof getOrdersSchema>['query'];
