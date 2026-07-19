import { useEffect, useRef, useState, useCallback } from "react";
import { getAccessToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export interface Message {
  id: number;
  room_id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  content: string;
  created_at: string;
  edited_at: string | null;
}

export function useRoomSocket(projectId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const { user, loading } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (loading || !user) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const token = getAccessToken() || "";
    if (!token) return;

    // Always base the WS URL off the exact API URL used by the rest of the app
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    let wsUrl = "";
    
    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      const isSecure = (typeof window !== "undefined" && window.location.protocol === "https:") || apiBase.startsWith("https");
      const proto = isSecure ? "wss" : "ws";
      
      // Strip http:// or https://
      let host = apiBase.replace(/^https?:\/\//, "");
      // Remove trailing slashes
      host = host.replace(/\/+$/, "");
      // Remove /api/v1 prefix to get the root domain where /ws/rooms is mounted
      host = host.replace(/\/api\/v1$/, "");
      
      wsUrl = `${proto}://${host}/ws/rooms/${projectId}?token=${encodeURIComponent(token)}`;
    } else {
      // Relative URL (e.g. "/api/v1") - typical in production deployments with same-origin proxies
      const proto = (typeof window !== "undefined" && window.location.protocol === "https:") ? "wss" : "ws";
      const host = typeof window !== "undefined" ? window.location.host : "localhost:8000";
      
      // Strip /api/v1 from the relative path if present, otherwise just use root
      let basePath = apiBase.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
      
      wsUrl = `${proto}://${host}${basePath}/ws/rooms/${projectId}?token=${encodeURIComponent(token)}`;
    }

    console.log("[WebSocket] Attempting connection:", {
      wsUrl,
      projectId,
      hasToken: !!token
    });
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[WebSocket] Connected successfully to:", wsUrl);
      setConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "typing") {
          if (msg.user_id === user?.id) return;
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.add(msg.user_id);
            return next;
          });
          // Auto remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => {
              const next = new Set(prev);
              next.delete(msg.user_id);
              return next;
            });
          }, 3000);
          return;
        }
        
        if (msg.type === "presence") {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            if (msg.status === "online") next.add(msg.user_id);
            else next.delete(msg.user_id);
            return next;
          });
          return;
        }

        setMessages((prev) => {
          // Avoid duplicate incoming messages
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch (err) {
        console.error("Failed to parse room message JSON", err);
      }
    };

    socket.onclose = (event) => {
      console.warn("[WebSocket] Connection closed:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      setConnected(false);
      // Automatically attempt reconnection in 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    socket.onerror = (err) => {
      console.error("[WebSocket] Socket error event:", err);
      socket.close();
    };
  }, [projectId, user, loading]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.onclose = null; // Prevent reconnect loop during unmount
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "message", content }));
    } else {
      console.warn("Unable to send: WebSocket is not open.");
    }
  }, []);

  const sendTyping = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "typing" }));
    }
  }, []);

  return {
    messages,
    setMessages,
    connected,
    sendMessage,
    sendTyping,
    typingUsers,
    onlineUsers
  };
}
