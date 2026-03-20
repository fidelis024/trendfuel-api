import { Schema, model, Document } from 'mongoose';

export interface ISeller extends Document {
  userId: Schema.Types.ObjectId;
  businessName: string;
  businessDescription?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rating: number;
  totalReviews: number;
  totalSales: number;
  createdAt: Date;
  updatedAt: Date;
}

const SellerSchema = new Schema<ISeller>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
    businessName: { type: String, required: true, trim: true },
    businessDescription: { type: String },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SellerSchema.index({ verificationStatus: 1 });
SellerSchema.index({ rating: -1 });

export default model<ISeller>('Seller', SellerSchema);
