import mongoose, { Document, Schema } from 'mongoose';

export enum EscrowStatus {
  HELD = 'held',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  PARTIAL_REFUND = 'partial_refund',
}

export interface IEscrow extends Document {
  orderId: mongoose.Types.ObjectId;
  amount: number;
  status: EscrowStatus;
  releasedAmount: number;
  refundedAmount: number;
  releasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EscrowSchema = new Schema<IEscrow>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(EscrowStatus),
      default: EscrowStatus.HELD,
      index: true,
    },
    releasedAmount: { type: Number, default: 0, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Escrow = mongoose.model<IEscrow>('Escrow', EscrowSchema);
