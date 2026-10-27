import api from './client';

export interface NotificationItem {
  notificationId: string;
  userId: string;
  isRead: boolean;
  notification: {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    creator: { name: string };
  };
}

export const notificationApi = {
  getMy: () =>
    api.get<{ data: { notifications: NotificationItem[]; unreadCount: number } }>('/notifications/my')
      .then(r => r.data.data),
  markAsRead: (notificationId: string) =>
    api.patch(`/notifications/${notificationId}/read`),
  markAllAsRead: () =>
    api.patch('/notifications/read-all'),
  create: (data: { title: string; message: string; batchId?: number }) =>
    api.post<{ data: any }>('/notifications', data).then(r => r.data.data),
};