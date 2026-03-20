// disputes/dispute.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IDispute extends Document {
  orderId: string;
  buyerId: string;
  sellerId: string;
  reason: string;
  status: 'open' | 'resolved' | 'escalated';
  resolution?: string;
  createdAt: Date;
}

const disputeSchema = new Schema<IDispute>(
  {
    orderId: { type: String, required: true },
    buyerId: { type: String, required: true },
    sellerId: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved', 'escalated'], default: 'open' },
    resolution: { type: String },
  },
  { timestamps: true }
);

export default model<IDispute>('Dispute', disputeSchema);
