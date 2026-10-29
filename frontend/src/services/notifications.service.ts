import { api } from "@/lib/api";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export const notificationsService = {
  getMesNotifications: (): Promise<Notification[]> =>
    api.get<Notification[]>("/notifications/me"),

  markAsRead: (notificationId: string): Promise<Notification> =>
    api.patch<Notification>(`/notifications/${notificationId}/read`),
};
