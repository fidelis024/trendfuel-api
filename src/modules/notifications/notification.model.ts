// notifications/notification.model.ts
import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  type: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default model<INotification>('Notification', notificationSchema);
