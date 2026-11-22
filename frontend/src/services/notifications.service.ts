import { api } from "@/lib/api";
import type {
  NotificationListResponse,
  NotificationMarkedResponse,
  NotificationReadAllResponse,
  NotificationResponse,
} from "@/types/domain";

export type Notification = NotificationResponse;

export const notificationsService = {
  getMesNotifications: (): Promise<NotificationListResponse> =>
    api.get<NotificationListResponse>("/notifications/me"),

  markAsRead: (notificationId: string): Promise<NotificationMarkedResponse> =>
    api.patch<NotificationMarkedResponse>(`/notifications/${notificationId}/read`),

  markAllAsRead: (): Promise<NotificationReadAllResponse> =>
    api.post<NotificationReadAllResponse>("/notifications/read-all"),
};
