import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
  ORDER = 'order',
  DISPUTE = 'dispute',
  PAYMENT = 'payment',
  REVIEW = 'review',
  SYSTEM = 'system',
  PROMO = 'promo',
  WITHDRAWAL = 'withdrawal',
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  meta: Record<string, unknown>; // e.g. { orderId, disputeId } for deep links
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    body: { type: String, required: true, maxlength: 500 },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    isRead: { type: Boolean, default: false, index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// TTL: auto-delete notifications older than 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);