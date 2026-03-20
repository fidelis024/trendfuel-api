import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  orderId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  rating: number;       // 1–5
  comment: string;
  isFlagged: boolean;   // flagged for moderation
  isVisible: boolean;   // hidden if spam / after moderation
  flagReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // one review per order
      index: true,
    },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 1000 },
    isFlagged: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true, index: true },
    flagReason: { type: String, default: null },
  },
  { timestamps: true }
);

ReviewSchema.index({ sellerId: 1, isVisible: 1, createdAt: -1 });
ReviewSchema.index({ serviceId: 1, isVisible: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);