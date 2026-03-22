import mongoose, { Document, Schema } from 'mongoose';

export enum TransactionType {
  TOPUP = 'topup',
  ORDER_DEBIT = 'order_debit',
  ESCROW_RELEASE = 'escrow_release',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  COMMISSION = 'commission',
  REFERRAL_BONUS = 'referral_bonus',
  PROMO = 'promo',
  SELLER_ACCESS_FEE = 'seller_access_fee',
}

export enum TransactionDirection {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaymentGateway {
  STRIPE = 'stripe',
  CRYPTO = 'crypto',
  BANK = 'bank',
  INTERNAL = 'internal',
}

export interface ITransaction extends Document {
  walletId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  direction: TransactionDirection;
  status: TransactionStatus;
  reference: string;
  relatedOrderId: mongoose.Types.ObjectId | null;
  gateway: PaymentGateway;
  gatewayMeta: Record<string, unknown>;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    amount: { type: Number, required: true, min: 0 },
    direction: { type: String, enum: Object.values(TransactionDirection), required: true },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      index: true,
    },
    reference: { type: String, required: true, unique: true, index: true },
    relatedOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      default: PaymentGateway.INTERNAL,
    },
    gatewayMeta: { type: Schema.Types.Mixed, default: {} },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ walletId: 1, type: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, type: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
