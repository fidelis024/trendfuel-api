import mongoose, { Document, Schema } from 'mongoose';

export enum DisputeStatus {
  OPEN = 'open',
  SELLER_RESPONDED = 'seller_responded',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
}

export enum DisputeResolution {
  REFUND_FULL = 'refund_full',
  REFUND_PARTIAL = 'refund_partial',
  NO_REFUND = 'no_refund',
}

export enum SellerPenalty {
  WARNING = 'warning',
  RANKING_DROP = 'ranking_drop',
  SUSPENSION = 'suspension',
  BAN = 'ban',
  NONE = 'none',
}

export interface IDispute extends Document {
  orderId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  reason: string;
  buyerStatement: string;
  sellerResponse: string | null;
  sellerRespondBy: Date | null;   // deadline for seller to respond
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  refundAmount: number;           // cents; 0 if no_refund
  sellerPenalty: SellerPenalty;
  resolvedBy: mongoose.Types.ObjectId | null; // admin user ID
  adminNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, required: true, maxlength: 200 },
    buyerStatement: { type: String, required: true, maxlength: 2000 },
    sellerResponse: { type: String, default: null, maxlength: 2000 },
    sellerRespondBy: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index: true,
    },
    resolution: { type: String, enum: Object.values(DisputeResolution), default: null },
    refundAmount: { type: Number, default: 0, min: 0 },
    sellerPenalty: {
      type: String,
      enum: Object.values(SellerPenalty),
      default: SellerPenalty.NONE,
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    adminNote: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DisputeSchema.index({ status: 1, createdAt: -1 }); // admin dispute queue
DisputeSchema.index({ orderId: 1 }, { unique: true }); // one dispute per order

export const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);