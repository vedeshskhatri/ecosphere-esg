import { create } from 'zustand';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAllRead: () => void;
  markAsRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => {
    const unread = notifications.filter((n) => !n.isRead).length;
    set({ notifications, unreadCount: unread });
  },
  addNotification: (notification) => {
    set((state) => {
      // Check if notification already exists (to avoid duplicates from fast double emissions)
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
      };
    });
  },
  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
  markAsRead: (id) => {
    set((state) => {
      const wasUnread = state.notifications.some((n) => n.id === id && !n.isRead);
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - (wasUnread ? 1 : 0)),
      };
    });
  },
}));
export default useNotificationStore;
