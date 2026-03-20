// orders/order.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IOrder extends Document {
  buyerId: string;
  sellerId: string;
  serviceId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    buyerId: { type: String, required: true },
    sellerId: { type: String, required: true },
    serviceId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default model<IOrder>('Order', orderSchema);
