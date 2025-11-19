import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'CAPITAL_CALL' | 'APPROVAL' | 'NOTIFICATION';
  relatedId?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: number;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  clearAll: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}));
