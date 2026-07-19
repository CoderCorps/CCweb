"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  content: string;
  created_at: string;
}

export function ProjectChat({ projectId }: { projectId: number | string }) {
  const { user, getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load historical messages
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/rooms/${projectId}/messages`);
        if (res.ok) {
          setMessages(await res.json());
        }
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };
    fetchHistory();

    // Connect WebSocket
    const currentToken = getToken();
    if (!currentToken) return;
    
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/rooms/${projectId}?token=${currentToken}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "presence" || data.type === "typing") return;
        
        // It's a message
        setMessages((prev) => [...prev, data]);
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [projectId, getToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({ type: "message", content: newMessage }));
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-[500px] glass rounded-xl border-border/40 overflow-hidden">
      <div className="bg-card/40 p-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          Project Chat
        </div>
        <div className="flex items-center gap-2 text-xs">
          {connected ? (
             <span className="text-emerald-400 font-medium flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span> Live</span>
          ) : (
             <span className="text-muted-foreground font-medium flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-500 inline-block"></span> Offline</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isMe = user?.id === msg.user_id;
          return (
            <div key={msg.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className="flex items-end gap-2 max-w-[80%]">
                {!isMe && (
                  <div className="h-6 w-6 rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/30">
                    {msg.user_avatar ? <img src={msg.user_avatar} alt="avatar" className="rounded-full" /> : msg.user_name.charAt(0)}
                  </div>
                )}
                <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? "bg-indigo-500 text-white rounded-br-sm" : "bg-card border border-border/60 text-slate-200 rounded-bl-sm"}`}>
                  <p>{msg.content}</p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 mx-8">
                {msg.created_at ? format(new Date(msg.created_at), "h:mm a") : "Now"}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-card/40 border-t border-border/40">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message the team..." 
            className="flex-1 bg-background/50 border-border/60 focus-visible:ring-indigo-500"
            disabled={!connected}
          />
          <Button type="submit" size="icon" disabled={!connected || !newMessage.trim()} className="bg-indigo-500 hover:bg-indigo-600">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
