/**
 * Zustand Store: Projects
 * Caches the project list so navigating between pages doesn't trigger
 * redundant API calls. Cleared on logout via useAuthStore.
 */
import { create } from "zustand";
import { api } from "@/lib/api";

export interface ProjectMember {
  user_id: number;
  role: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  start_date?: string;
  end_date?: string;
  mentor?: { id: number; name: string };
  members: ProjectMember[];
}

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchProjects: () => Promise<void>;
  addProject: (project: Project) => void;
  reset: () => void;
}

const CACHE_TTL_MS = 30_000; // 30 seconds cache

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  lastFetched: null,

  fetchProjects: async () => {
    const { lastFetched, loading } = get();
    // Skip if data is fresh or already fetching
    if (loading) return;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return;

    set({ loading: true, error: null });
    try {
      const res = await api.get("/projects");
      if (res.ok) {
        const data = await res.json();
        set({ projects: data, lastFetched: Date.now() });
      } else {
        set({ error: "Failed to load projects." });
      }
    } catch {
      set({ error: "Server connection failed." });
    } finally {
      set({ loading: false });
    }
  },

  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),

  reset: () =>
    set({ projects: [], loading: false, error: null, lastFetched: null }),
}));
