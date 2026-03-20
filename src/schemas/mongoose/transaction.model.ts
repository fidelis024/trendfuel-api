import mongoose, { Document, Schema } from 'mongoose';

export enum TransactionType {
  TOPUP = 'topup',                   // buyer adds funds
  ORDER_DEBIT = 'order_debit',       // buyer pays for order
  ESCROW_RELEASE = 'escrow_release', // funds released to seller
  WITHDRAWAL = 'withdrawal',         // seller withdraws
  REFUND = 'refund',                 // buyer refunded
  COMMISSION = 'commission',         // platform takes its cut
  REFERRAL_BONUS = 'referral_bonus', // referral reward
  PROMO = 'promo',                   // promo code credit
  SELLER_ACCESS_FEE = 'seller_access_fee', // one-time seller onboarding fee
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
  INTERNAL = 'internal', // wallet-to-wallet moves
}

export interface ITransaction extends Document {
  walletId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;           // always positive (cents)
  direction: TransactionDirection;
  status: TransactionStatus;
  reference: string;        // unique idempotency key
  relatedOrderId: mongoose.Types.ObjectId | null;
  gateway: PaymentGateway;
  gatewayMeta: Record<string, unknown>; // raw gateway payload for reconciliation
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
TransactionSchema.index({ status: 1, type: 1 }); // for admin finance dashboard

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);