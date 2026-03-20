// reviews/review.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IReview extends Document {
  orderId: string;
  buyerId: string;
  sellerId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    orderId: { type: String, required: true },
    buyerId: { type: String, required: true },
    sellerId: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
  },
  { timestamps: true }
);

export default model<IReview>('Review', reviewSchema);
