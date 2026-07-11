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

    // Dynamically resolve backend websocket protocol and host to support relative URLs, localhost, and secure hosting
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    let host = "";
    let proto = "ws";

    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      proto = (typeof window !== "undefined" && window.location.protocol === "https:") || apiBase.startsWith("https") ? "wss" : "ws";
      host = apiBase.replace(/^https?:\/\//, "");
      host = host.replace(/\/+$/, "");
      host = host.replace(/\/api\/v1$/, "");
    } else {
      if (typeof window !== "undefined") {
        proto = window.location.protocol === "https:" ? "wss" : "ws";
        host = window.location.host;
      } else {
        host = "localhost:8000";
      }
    }

    const wsUrl = `${proto}://${host}/ws/rooms/${projectId}?token=${encodeURIComponent(token)}`;
    console.log("[WebSocket] Attempting connection:", {
      wsUrl,
      proto,
      host,
      projectId,
      hasToken: !!token,
      tokenLength: token.length
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
