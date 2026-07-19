/**
 * Zustand Store: Dashboard
 * Caches the dashboard summary per role so switching tabs or revisiting
 * the dashboard feels instant.
 */
import { create } from "zustand";
import { api } from "@/lib/api";

interface DashboardStats {
  active_projects: number;
  total_students?: number;
  total_mentors?: number;
  pending_reviews?: number;
  approved_certificates?: number;
  tasks_completed?: number;
  tasks_total?: number;
  certificates_earned?: number;
}

interface ActiveTask {
  id: number;
  title: string;
  status: string;
  project_title: string;
  sprint_number: number;
}

interface PendingSubmission {
  id: number;
  project_title: string;
  student_name: string;
  submitted_at: string;
  repo_url: string | null;
  demo_url: string | null;
}

interface RecentSubmission {
  id: number;
  project_title: string;
  student_name: string;
  submitted_at: string;
  repo_url: string | null;
  demo_url: string | null;
  status: string;
}

interface Certificate {
  id: number;
  project_title: string;
  issued_at: string;
  criteria: {
    student_name?: string;
    mentor_name?: string;
    demo_url?: string;
    repo_url?: string;
    approved_at?: string;
    audit_message?: string;
    [key: string]: unknown;
  };
}

interface Badge {
  id: number;
  name: string;
  description: string;
  image_url: string;
  earned_at: string;
}

interface DashboardUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface DashboardData {
  role: string;
  stats: DashboardStats;
  active_tasks?: ActiveTask[];
  certificates?: Certificate[];
  badges?: Badge[];
  pending_submissions?: PendingSubmission[];
  recent_submissions?: RecentSubmission[];
  users?: DashboardUser[];
}

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchDashboard: () => Promise<void>;
  invalidate: () => void;
  reset: () => void;
}

const CACHE_TTL_MS = 60_000; // 1 minute cache

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  lastFetched: null,

  fetchDashboard: async () => {
    const { lastFetched, loading } = get();
    if (loading) return;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return;

    set({ loading: true, error: null });
    try {
      const res = await api.get("/dashboard/summary");
      if (res.ok) {
        const data: DashboardData = await res.json();
        set({ data, lastFetched: Date.now() });
      } else {
        set({ error: "Failed to load dashboard." });
      }
    } catch {
      set({ error: "Server connection failed." });
    } finally {
      set({ loading: false });
    }
  },

  // Force a refetch on next fetchDashboard() call (e.g. after a review action)
  invalidate: () => set({ lastFetched: null }),

  reset: () =>
    set({ data: null, loading: false, error: null, lastFetched: null }),
}));
