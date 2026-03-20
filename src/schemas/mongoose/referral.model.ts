import mongoose, { Document, Schema } from 'mongoose';

export enum ReferralStatus {
  PENDING = 'pending', // referred user signed up but hasn't met reward condition
  REWARDED = 'rewarded', // reward credited to referrer
}

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredUserId: mongoose.Types.ObjectId;
  status: ReferralStatus;
  rewardAmount: number; // cents credited to referrer wallet
  rewardedAt: Date | null;
  createdAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // a user can only be referred once
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ReferralStatus),
      default: ReferralStatus.PENDING,
    },
    rewardAmount: { type: Number, default: 0, min: 0 },
    rewardedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ReferralSchema.index({ referrerId: 1, status: 1 });

export const Referral = mongoose.model<IReferral>('Referral', ReferralSchema);
