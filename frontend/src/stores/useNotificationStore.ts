/**
 * Zustand Store: Notifications
 * Shared across the sidebar NotificationBell and any page that reads notifications.
 * Avoids the bell and individual pages both fetching separately.
 */
import { create } from "zustand";
import { api } from "@/lib/api";

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  lastFetched: number | null;
  fetchNotifications: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

const CACHE_TTL_MS = 15_000; // 15 seconds

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  lastFetched: null,

  fetchNotifications: async () => {
    const { lastFetched, loading } = get();
    if (loading) return;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return;

    set({ loading: true });
    try {
      const res = await api.get("/notifications");
      if (res.ok) {
        const data: Notification[] = await res.json();
        set({
          notifications: data,
          unreadCount: data.filter((n) => !n.read_at).length,
          lastFetched: Date.now(),
        });
      }
    } catch {
      // Silently fail for notifications
    } finally {
      set({ loading: false });
    }
  },

  markRead: async (id) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`, {});
      if (res.ok) {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      }
    } catch {
      // Silent
    }
  },

  markAllRead: async () => {
    try {
      const res = await api.patch("/notifications/read-all", {});
      if (res.ok) {
        const now = new Date().toISOString();
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            read_at: n.read_at ?? now,
          })),
          unreadCount: 0,
        }));
      }
    } catch {
      // Silent
    }
  },

  reset: () =>
    set({ notifications: [], unreadCount: 0, loading: false, lastFetched: null }),
}));
