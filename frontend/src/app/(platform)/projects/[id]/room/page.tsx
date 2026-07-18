"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useRoomSocket } from "@/hooks/useRoomSocket";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Send, 
  MessageSquare, 
  Wifi, 
  WifiOff, 
  AlertCircle
} from "lucide-react";
import Image from "next/image";
import { AnnouncementBanner } from "@/components/projects/announcement-banner";
import { ReactionBar } from "@/components/reactions/reaction-bar";

interface Project {
  id: number;
  title: string;
  description: string;
}

export default function ProjectRoomPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const { user } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");

  const { messages, setMessages, connected, sendMessage, sendTyping, typingUsers, onlineUsers } = useRoomSocket(projectId);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Project Details & Messages history on mount
  useEffect(() => {
    async function loadHistoryAndProject() {
      try {
        const projRes = await api.get(`/projects/${projectId}`);
        if (!projRes.ok) {
          setError("Project room not found.");
          setLoading(false);
          return;
        }
        const projData = await projRes.json();
        setProject(projData);

        // Fetch REST history
        const msgRes = await api.get(`/rooms/${projectId}/messages?limit=100`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData);
        }
      } catch (err) {
        setError("Failed to initialize chat room.");
      } finally {
        setLoading(false);
      }
    }

    loadHistoryAndProject();
  }, [projectId, setMessages]);

  // 2. Auto-scroll to bottom of chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (e.target.value.trim().length > 0) {
      if (!typingTimeoutRef.current) {
        sendTyping();
        typingTimeoutRef.current = setTimeout(() => {
          typingTimeoutRef.current = null;
        }, 2000);
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-card rounded-xl" />
        <div className="h-[500px] bg-card rounded-xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="glass p-6 text-center border-red-500/20 flex flex-col items-center gap-3">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <h3 className="text-lg font-bold text-white">Chat Room Error</h3>
        <p className="text-sm text-muted-foreground">{error || "Could not resolve chat details."}</p>
        <Button onClick={() => router.push(`/projects/${projectId}`)}>Return to Project Board</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header card */}
      <div className="glass px-6 py-4 rounded-xl border-border/40 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border border-border bg-card/60"
            onClick={() => router.push(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-400" />
              {project.title} Team Chat
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {onlineUsers.size > 0 
                ? <span className="text-emerald-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> {onlineUsers.size} member{onlineUsers.size !== 1 ? 's' : ''} online</span>
                : "Collaborate with your project team in real-time."
              }
            </p>
          </div>
        </div>

        {/* WebSocket Connection Status Badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${
          connected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
        }`}>
          {connected ? (
            <>
              <Wifi className="h-3.5 w-3.5 animate-pulse" />
              <span>LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              <span>RECONNECTING...</span>
            </>
          )}
        </div>
      </div>

      <AnnouncementBanner projectId={projectId} />

      {/* Main chat interface card */}
      <Card className="glass border-border/40 overflow-hidden flex flex-col h-[550px] sm:h-[600px]">
        {/* Messages viewport */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-black/10">
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isSelf = msg.user_id === user?.id;
              return (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[70%] ${
                    isSelf ? "ml-auto flex-row-reverse text-right" : "mr-auto text-left"
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className="h-8 w-8 rounded-full bg-indigo-600/30 border border-indigo-500/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-indigo-300 overflow-hidden">
                    {msg.user_avatar ? (
                      <Image 
                        src={msg.user_avatar} 
                        alt={msg.user_name} 
                        width={32} 
                        height={32} 
                        className="object-cover"
                      />
                    ) : (
                      getInitials(msg.user_name)
                    )}
                  </div>

                  <div className="space-y-1">
                    {/* Meta info */}
                    {!isSelf && (
                      <span className="text-[10px] font-bold text-indigo-400 font-mono block">
                        {msg.user_name}
                      </span>
                    )}
                    
                    {/* Message Bubble */}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isSelf 
                        ? "bg-indigo-600 text-white rounded-tr-none text-left" 
                        : "bg-card border border-border rounded-tl-none text-white"
                    }`}>
                      {msg.content}
                    </div>

                    {/* Time Stamp & Reactions */}
                    <div className={`flex items-center gap-2 px-1 ${isSelf ? "justify-end flex-row-reverse" : "justify-start"}`}>
                      <span className="text-[9px] text-muted-foreground font-mono block">
                        {new Date(msg.created_at.endsWith('Z') ? msg.created_at : msg.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <ReactionBar targetType="message" targetId={msg.id} />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 text-border/60 animate-bounce" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-white">No messages yet</p>
                <p className="text-xs">Send a message to start collaboration with your teammates!</p>
              </div>
            </div>
          )}
          {typingUsers.size > 0 && (
            <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2 animate-pulse pl-4">
              <span className="flex gap-0.5">
                <span className="h-1 w-1 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="h-1 w-1 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                <span className="h-1 w-1 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
              </span>
              Someone is typing...
            </div>
          )}
          <div ref={messageEndRef} />
        </CardContent>

        {/* Input box */}
        <div className="p-4 border-t border-border/40 bg-card/60 backdrop-blur-sm">
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <Input
              value={inputText}
              onChange={handleInputChange}
              placeholder="Type your message..."
              disabled={!connected}
              className="flex-1 border border-border bg-black/20 focus-visible:ring-indigo-500/50"
            />
            <Button 
              type="submit" 
              disabled={!connected || !inputText.trim()}
              className="font-semibold gap-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
