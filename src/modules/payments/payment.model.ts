// payments/payment.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IPayment extends Document {
  orderId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    paymentMethod: { type: String, required: true },
  },
  { timestamps: true }
);

export default model<IPayment>('Payment', paymentSchema);
