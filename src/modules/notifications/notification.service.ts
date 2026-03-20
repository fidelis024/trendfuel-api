// notifications/notification.service.ts
import Notification, { INotification } from './notification.model';

export class NotificationService {
  async createNotification(notificationData: any): Promise<INotification> {
    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  }

  async getUserNotifications(userId: string): Promise<INotification[]> {
    return Notification.find({ userId }).sort({ createdAt: -1 });
  }

  async markAsRead(notificationId: string): Promise<INotification> {
    return Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    ) as Promise<INotification>;
  }
}

export default new NotificationService();
