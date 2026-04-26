import mongoose, { Document, Schema } from 'mongoose';

export interface ISellerKYC extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  nin: string;
  dateOfBirth: Date;
  phone: string;
  streetAddress: string;
  city: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: mongoose.Types.ObjectId | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SellerKYCSchema = new Schema<ISellerKYC>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one KYC per user
      index: true,
    },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    nin: { type: String, required: true, trim: true, maxlength: 11 },
    dateOfBirth: { type: Date, required: true },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    streetAddress: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true }
);

SellerKYCSchema.index({ status: 1, createdAt: -1 });

export const SellerKYC = mongoose.model<ISellerKYC>('SellerKYC', SellerKYCSchema);
