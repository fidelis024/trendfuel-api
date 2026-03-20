// escrow/escrow.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IEscrow extends Document {
  orderId: string;
  amount: number;
  holdReleaseDate: Date;
  status: 'held' | 'released' | 'refunded';
}

const escrowSchema = new Schema<IEscrow>(
  {
    orderId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    holdReleaseDate: { type: Date, required: true },
    status: { type: String, enum: ['held', 'released', 'refunded'], default: 'held' },
  },
  { timestamps: true }
);

export default model<IEscrow>('Escrow', escrowSchema);
