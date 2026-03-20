// services/service.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IService extends Document {
  sellerId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image?: string;
  createdAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    sellerId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
  },
  { timestamps: true }
);

export default model<IService>('Service', serviceSchema);
