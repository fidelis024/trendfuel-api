import mongoose, { Document, Schema } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// ← ADD this interface
export interface ICredentialField {
  label: string;
  value: string;
}

export interface IOrder extends Document {
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  platformFee: number;
  sellerEarnings: number;
  status: OrderStatus;
  deliveryLink: string | null;
  deliveredAt: Date | null;
  autoCompleteAt: Date | null;
  completedAt: Date | null;
  buyerNote: string | null;
  credentials: ICredentialField[]; // ← ADD
  credentialsUpdatedAt: Date | null; // ← ADD
  createdAt: Date;
  updatedAt: Date;
}

// ← ADD this sub-schema before OrderSchema
const CredentialFieldSchema = new Schema<ICredentialField>(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    value: { type: String, required: true, maxlength: 1000 },
  },
  { _id: false }
);

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
    autoCompleteAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    buyerNote: { type: String, default: null, maxlength: 500 },
    credentials: { type: [CredentialFieldSchema], default: [] }, // ← ADD
    credentialsUpdatedAt: { type: Date, default: null }, // ← ADD
  },
  { timestamps: true }
);

OrderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ status: 1, autoCompleteAt: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
