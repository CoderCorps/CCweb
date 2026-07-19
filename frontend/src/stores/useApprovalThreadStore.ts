import { create } from "zustand";
import { getAccessToken } from "@/lib/api";

export interface ApprovalMessage {
  id: number;
  project_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user_name: string;
  user_role: string;
}

interface ApprovalThreadState {
  messages: ApprovalMessage[];
  isConnected: boolean;
  socket: WebSocket | null;
  error: string | null;

  connect: (projectId: number) => void;
  disconnect: () => void;
  sendMessage: (content: string) => void;
  setMessages: (messages: ApprovalMessage[]) => void;
}

export const useApprovalThreadStore = create<ApprovalThreadState>((set, get) => ({
  messages: [],
  isConnected: false,
  socket: null,
  error: null,

  setMessages: (messages) => set({ messages }),

  connect: (projectId: number) => {
    const currentSocket = get().socket;
    if (currentSocket?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      set({ error: "Authentication required" });
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const socket = new WebSocket(`${wsUrl}/api/v1/projects/${projectId}/approval-thread/ws?token=${token}`);

    socket.onopen = () => {
      set({ isConnected: true, error: null });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat_message") {
          set((state) => ({
            messages: [...state.messages, data.message],
          }));
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    socket.onclose = () => {
      set({ isConnected: false, socket: null });
    };

    socket.onerror = () => {
      set({ error: "WebSocket connection error" });
    };

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  sendMessage: (content: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type: "chat_message", content }));
    }
  },
}));
