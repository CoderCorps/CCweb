"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MessagesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeUserId = searchParams.get("user") ? parseInt(searchParams.get("user") as string) : null;

  const [threads, setThreads] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (activeUserId) {
      fetchMessages(activeUserId);
    } else {
      setMessages([]);
    }
  }, [activeUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchThreads = async () => {
    try {
      const res = await api.get("/messages/threads");
      const data = await res.json();
      setThreads(data);
    } catch (err) {
      console.error("Failed to fetch threads", err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (id: number) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/thread/${id}`);
      const data = await res.json();
      setMessages(data);

      // Mark unread as read
      const unread = data.filter((m: any) => m.recipient_id === user?.id && !m.read_at);
      for (const m of unread) {
        await api.patch(`/messages/${m.id}/read`, {});
      }
      
      if (unread.length > 0) {
        fetchThreads(); // Refresh thread unread counts
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUserId) return;

    try {
      const res = await api.post("/messages", {
        recipient_id: activeUserId,
        content: newMessage
      });
      const data = await res.json();
      setMessages([...messages, data]);
      setNewMessage("");
      fetchThreads(); // Move thread to top
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const activeThread = threads.find(t => t.user.id === activeUserId);

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 max-w-7xl mx-auto w-full">
      {/* Threads Sidebar */}
      <Card className="w-full md:w-1/3 flex flex-col overflow-hidden glass border-white/10 dark:border-white/5">
        <div className="p-4 border-b border-border/50">
          <h2 className="text-lg font-semibold tracking-tight">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingThreads ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">No messages yet.</div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.user.id}
                onClick={() => router.push(`/messages?user=${thread.user.id}`)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                  activeUserId === thread.user.id 
                    ? "bg-primary/10 hover:bg-primary/15" 
                    : "hover:bg-accent"
                }`}
              >
                <img 
                  src={thread.user.avatar_url} 
                  alt={thread.user.name} 
                  className="w-10 h-10 rounded-full bg-muted object-cover"
                />
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium text-sm truncate">{thread.user.name}</p>
                    {thread.unread_count > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {thread.last_message.sender_id === user?.id ? "You: " : ""}
                    {thread.last_message.content}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Active Conversation */}
      <Card className="hidden md:flex flex-col flex-1 overflow-hidden glass border-white/10 dark:border-white/5">
        {activeUserId ? (
          <>
            <div className="p-4 border-b border-border/50 flex items-center gap-3">
              {activeThread ? (
                <>
                  <img 
                    src={activeThread.user.avatar_url} 
                    alt={activeThread.user.name} 
                    className="w-10 h-10 rounded-full bg-muted object-cover"
                  />
                  <div>
                    <h2 className="font-semibold">{activeThread.user.name}</h2>
                    <p className="text-xs text-muted-foreground capitalize">{activeThread.user.role}</p>
                  </div>
                </>
              ) : (
                <div className="h-10 flex items-center text-muted-foreground">Loading user...</div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="text-center text-muted-foreground">Loading messages...</div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user?.id;
                  const showAvatar = !isMe && (idx === 0 || messages[idx-1].sender_id !== msg.sender_id);
                  
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
                      {!isMe && (
                        <div className="w-8">
                          {showAvatar && activeThread && (
                            <img 
                              src={activeThread.user.avatar_url} 
                              alt="Avatar" 
                              className="w-8 h-8 rounded-full bg-muted object-cover"
                            />
                          )}
                        </div>
                      )}
                      
                      <div 
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                        <div className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-border/50 flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-background/50 border-none"
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </Card>
    </div>
  );
}
