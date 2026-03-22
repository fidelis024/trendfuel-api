import mongoose, { Document, Schema } from 'mongoose';

export enum WalletType {
  BUYER = 'buyer',
  SELLER = 'seller',
}

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  type: WalletType;
  balance: number;
  pendingBalance: number;
  clearedBalance: number;
  lifetimeEarnings: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    type: { type: String, enum: Object.values(WalletType), required: true },
    balance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    clearedBalance: { type: Number, default: 0, min: 0 },
    lifetimeEarnings: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true, trim: true },
  },
  { timestamps: true }
);

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
