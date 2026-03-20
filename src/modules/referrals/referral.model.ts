// referrals/referral.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IReferral extends Document {
  referrerId: string;
  refereeId: string;
  status: 'pending' | 'completed';
  reward: number;
  createdAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referrerId: { type: String, required: true },
    refereeId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    reward: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default model<IReferral>('Referral', referralSchema);
