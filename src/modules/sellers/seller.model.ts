// Placeholder files for additional modules

// sellers/seller.model.ts
import { Schema, model, Document } from 'mongoose';

export interface ISeller extends Document {
  userId: string;
  businessName: string;
  businessDescription: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rating: number;
  totalReviews: number;
  totalSales: number;
}

const sellerSchema = new Schema<ISeller>(
  {
    userId: { type: String, required: true, unique: true },
    businessName: { type: String, required: true },
    businessDescription: { type: String },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default model<ISeller>('Seller', sellerSchema);
