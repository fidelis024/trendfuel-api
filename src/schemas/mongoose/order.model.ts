import mongoose, { Document, Schema } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',           // paid, waiting for seller to start
  PROCESSING = 'processing',     // seller accepted / working
  DELIVERED = 'delivered',       // seller marked delivered
  COMPLETED = 'completed',       // buyer confirmed OR timer expired
  DISPUTED = 'disputed',         // buyer opened dispute
  CANCELLED = 'cancelled',       // cancelled before processing
  REFUNDED = 'refunded',         // full refund issued
}

export interface IOrder extends Document {
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;       // snapshot at time of order (cents)
  totalAmount: number;     // quantity * unitPrice
  platformFee: number;     // commission taken by platform
  sellerEarnings: number;  // totalAmount - platformFee
  status: OrderStatus;
  deliveryLink: string | null;  // URL/proof seller submits
  deliveredAt: Date | null;
  autoCompleteAt: Date | null;  // set when delivered, buyer has X hours to dispute
  completedAt: Date | null;
  buyerNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    sellerEarnings: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
    deliveryLink: { type: String, default: null },
    deliveredAt: { type: Date, default: null },
    autoCompleteAt: { type: Date, default: null, index: true }, // queried by cron/queue
    completedAt: { type: Date, default: null },
    buyerNote: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true }
);

// Key compound indexes
OrderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ status: 1, autoCompleteAt: 1 }); // for the auto-complete job

export const Order = mongoose.model<IOrder>('Order', OrderSchema);