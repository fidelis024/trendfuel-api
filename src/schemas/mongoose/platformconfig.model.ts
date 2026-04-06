import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformConfig extends Document {
  commissionRate: number; // e.g. 0.20 = 20%
  sellerAccessFee: number; // cents e.g. 1500 = $15.00
  withdrawalFeeRate: number; // e.g. 0.03 = 3%
  orderAutoCompleteHours: number;
  sellerRespondHours: number;
  withdrawalDelayDays: number;
  updatedBy: mongoose.Types.ObjectId | null;
  updatedAt: Date;
  createdAt: Date;
}

const PlatformConfigSchema = new Schema<IPlatformConfig>(
  {
    commissionRate: {
      type: Number,
      required: true,
      default: 0.2,
      min: 0,
      max: 1,
    },
    sellerAccessFee: {
      type: Number,
      required: true,
      default: 1500, // $15.00
      min: 0,
    },
    withdrawalFeeRate: {
      type: Number,
      required: true,
      default: 0.03,
      min: 0,
      max: 1,
    },
    orderAutoCompleteHours: {
      type: Number,
      required: true,
      default: 72,
    },
    sellerRespondHours: {
      type: Number,
      required: true,
      default: 48,
    },
    withdrawalDelayDays: {
      type: Number,
      required: true,
      default: 7,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export const PlatformConfig = mongoose.model<IPlatformConfig>(
  'PlatformConfig',
  PlatformConfigSchema
);
