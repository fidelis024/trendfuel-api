import mongoose, { Document, Schema } from 'mongoose';

export interface IRefillPolicy {
  offered: boolean;
  windowDays: number;
  conditions: string;
}

export interface IServiceStats {
  totalOrders: number;
  avgRating: number;
  completionRate: number;
}

export interface IService extends Document {
  sellerId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  pricePerUnit: number;
  minQty: number;
  maxQty: number;
  deliveryHours: number;
  refillPolicy: IRefillPolicy;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  requiresCredentials: boolean;
  rankScore: number;
  stats: IServiceStats;
  createdAt: Date;
  updatedAt: Date;
}

const RefillPolicySchema = new Schema<IRefillPolicy>(
  {
    offered: { type: Boolean, default: false },
    windowDays: { type: Number, default: 0 },
    conditions: { type: String, default: '' },
  },
  { _id: false }
);

const ServiceStatsSchema = new Schema<IServiceStats>(
  {
    totalOrders: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    completionRate: { type: Number, default: 100, min: 0, max: 100 },
  },
  { _id: false }
);

const ServiceSchema = new Schema<IService>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2000 },
    pricePerUnit: { type: Number, required: true, min: 0 },
    minQty: { type: Number, required: true, min: 1 },
    maxQty: { type: Number, required: true },
    deliveryHours: { type: Number, required: true, min: 1 },
    refillPolicy: {
      type: RefillPolicySchema,
      default: () => ({ offered: false, windowDays: 0, conditions: '' }),
    },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    requiresCredentials: { type: Boolean, default: false, index: true },
    rankScore: { type: Number, default: 0, index: true },
    stats: {
      type: ServiceStatsSchema,
      default: () => ({ totalOrders: 0, avgRating: 0, completionRate: 100 }),
    },
  },
  { timestamps: true }
);

// Compound indexes for marketplace queries
ServiceSchema.index({ categoryId: 1, isActive: 1, rankScore: -1 });
ServiceSchema.index({ sellerId: 1, isActive: 1 });
ServiceSchema.index({ tags: 1, isActive: 1 });
ServiceSchema.index({ isFeatured: 1, rankScore: -1 });
ServiceSchema.index({ title: 'text', description: 'text', tags: 'text' }); // full-text search

export const Service = mongoose.model<IService>('Service', ServiceSchema);
