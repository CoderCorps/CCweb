/**
 * Zustand Store: Current Project Workspace
 * Caches the currently open project's data (project detail, sprints, tasks).
 * Shared between the workspace page, leaderboard, manage board, and pair room.
 */
import { create } from "zustand";
import { api } from "@/lib/api";

export interface Sprint {
  id: number;
  sprint_number: number;
  start_date: string;
  end_date: string;
  goal: string;
  tasks: Task[];
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  difficulty?: string;
  task_mode?: string;
  github_pr_url: string | null;
  ci_status: string | null;
  test_coverage: number | null;
  due_date: string | null;
  assignee?: {
    id: number;
    name: string;
    avatar_url?: string | null;
  } | null;
  assignments?: { user_id: number; user: { name: string } | null }[];
}

export interface ProjectDetail {
  id: number;
  title: string;
  description: string;
  status: string;
  mentor_id: number;
  mentor?: { id: number; name: string };
  members: { 
    user_id: number; 
    role: string;
    user: {
      id: number;
      name: string;
      avatar_url?: string | null;
    }
  }[];
  start_date?: string;
  end_date?: string;
}

interface ProjectWorkspaceState {
  projectId: number | null;
  project: ProjectDetail | null;
  sprints: Sprint[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  fetchWorkspace: (id: number | string) => Promise<void>;
  updateTaskStatus: (taskId: number, status: string) => void;
  invalidate: () => void;
  reset: () => void;
}

const CACHE_TTL_MS = 30_000;

export const useProjectWorkspaceStore = create<ProjectWorkspaceState>((set, get) => ({
  projectId: null,
  project: null,
  sprints: [],
  loading: false,
  error: null,
  lastFetched: null,

  fetchWorkspace: async (id) => {
    const numId = Number(id);
    const { projectId, lastFetched, loading } = get();

    // Use cache only if same project is still fresh
    if (loading) return;
    if (
      projectId === numId &&
      lastFetched &&
      Date.now() - lastFetched < CACHE_TTL_MS
    )
      return;

    if (projectId !== numId) {
      set({ loading: true, error: null, projectId: numId, project: null, sprints: [] });
    } else {
      set({ loading: true, error: null });
    }
    try {
      const [projRes, sprintsRes] = await Promise.all([
        api.get(`/projects/${numId}`),
        api.get(`/projects/${numId}/sprints`),
      ]);

      if (!projRes.ok || !sprintsRes.ok) {
        set({ error: "Failed to load project." });
        return;
      }

      const [project, sprints] = await Promise.all([
        projRes.json(),
        sprintsRes.json(),
      ]);

      set({ project, sprints, lastFetched: Date.now() });
    } catch {
      set({ error: "Server connection failed." });
    } finally {
      set({ loading: false });
    }
  },

  // Optimistic task status update — no need to refetch sprints
  updateTaskStatus: (taskId, status) => {
    set((state) => ({
      sprints: state.sprints.map((sprint) => ({
        ...sprint,
        tasks: sprint.tasks.map((task) =>
          task.id === taskId ? { ...task, status } : task
        ),
      })),
    }));
  },

  invalidate: () => set({ lastFetched: null }),

  reset: () =>
    set({
      projectId: null,
      project: null,
      sprints: [],
      loading: false,
      error: null,
      lastFetched: null,
    }),
}));
