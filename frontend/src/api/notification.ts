import api from './client';

export interface NotificationItem {
  id: string;
  notificationId: string;
  userId: string;
  isRead: boolean;
  deliveryStatus?: string;
  channel?: string;
  sentAt?: string | null;
  readAt?: string | null;
  notification: {
    id: string;
    title: string;
    message: string;
    category?: string;
    priority?: string;
    entityType?: string | null;
    entityId?: string | null;
    createdAt: string;
    creator?: { id: string; name: string; role?: string } | null;
  };
}

export interface NotificationPreferences {
  [category: string]: {
    in_app: boolean;
    email: boolean;
    push: boolean;
  };
}

export const notificationApi = {
  getMy: (params?: { category?: string; priority?: string; unreadOnly?: boolean; page?: number; limit?: number }) =>
    api.get('/notifications/my', { params }).then((r) => {
      const resp = r.data;
      const items: NotificationItem[] = Array.isArray(resp.data)
        ? resp.data
        : resp.data?.notifications || [];
      const unreadCount = resp.meta?.unreadCount ?? resp.data?.unreadCount ?? 0;
      return { notifications: items, unreadCount, meta: resp.meta };
    }),

  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.patch('/notifications/read-all'),

  create: (data: { title: string; message: string; batchId?: number; category?: string; priority?: string }) =>
    api.post<{ data: any }>('/notifications', data).then((r) => r.data.data),

  getPreferences: () =>
    api.get<{ success: boolean; data: NotificationPreferences }>('/notifications/preferences').then((r) => r.data.data),

  updatePreferences: (prefs: NotificationPreferences) =>
    api.put<{ success: boolean; data: NotificationPreferences }>('/notifications/preferences', prefs).then((r) => r.data.data),

  subscribePush: (endpoint: string, keys: { p256dh: string; auth: string }) =>
    api.post('/notifications/push/subscribe', { endpoint, keys }),

  getAdminStats: () =>
    api.get<{ success: boolean; data: any }>('/notifications/admin/stats').then((r) => r.data.data),

  retryFailed: () =>
    api.post<{ success: boolean; data: { queuedForRetry: number } }>('/notifications/admin/retry').then((r) => r.data.data),
};
