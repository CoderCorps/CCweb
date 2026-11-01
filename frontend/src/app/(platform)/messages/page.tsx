"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, MessageSquare, Clock, User as UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ThreadUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
}

interface Thread {
  user: ThreadUser;
  unread_count: number;
  last_message: {
    sender_id: number;
    content: string;
    created_at: string;
  };
}

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  created_at: string;
  read_at?: string | null;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeUserId = searchParams.get("user")
    ? parseInt(searchParams.get("user") as string, 10)
    : null;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await api.get("/messages/threads");
      if (res.ok) {
        const data = await res.json();
        setThreads(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch threads", err);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const fetchMessages = useCallback(
    async (id: number) => {
      setLoadingMessages(true);
      try {
        const res = await api.get(`/messages/thread/${id}`);
        if (res.ok) {
          const data: Message[] = await res.json();
          setMessages(data || []);

          // Parallel mark unread as read
          const unread = (data || []).filter(
            (m) => m.recipient_id === user?.id && !m.read_at
          );
          if (unread.length > 0) {
            await Promise.all(
              unread.map((m) => api.patch(`/messages/${m.id}/read`, {}))
            );
            fetchThreads(); // Refresh thread unread counters
          }
        }
      } catch (err) {
        console.error("Failed to fetch messages", err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [user, fetchThreads]
  );

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (activeUserId) {
      fetchMessages(activeUserId);

      // Light polling every 6 seconds for new messages in active thread
      const pollTimer = setInterval(() => {
        fetchMessages(activeUserId);
      }, 6000);
      return () => clearInterval(pollTimer);
    } else {
      setMessages([]);
    }
  }, [activeUserId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUserId) return;

    const contentToSend = newMessage.trim();
    setNewMessage("");

    try {
      const res = await api.post("/messages", {
        recipient_id: activeUserId,
        content: contentToSend,
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data]);
        fetchThreads(); // Move thread to top
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const activeThread = threads.find((t) => t.user.id === activeUserId);

  const getAvatarUrl = (userObj?: { name?: string; avatar_url?: string | null }) => {
    if (userObj?.avatar_url) return userObj.avatar_url;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      userObj?.name || "User"
    )}`;
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] gap-4 sm:gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* Threads Sidebar (Full width on mobile when no thread selected; hidden on mobile when thread is active) */}
      <Card
        className={`${
          activeUserId ? "hidden md:flex" : "flex"
        } w-full md:w-1/3 flex-col overflow-hidden glass-premium border-border/50 shadow-lg`}
      >
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Direct Messages</h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
            {threads.length} Threads
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loadingThreads ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-mono animate-pulse">
              Loading conversations...
            </div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-foreground">No messages yet</p>
              <p className="text-[11px] text-muted-foreground">
                You can start conversations from student rosters, mentor boards, or team rooms.
              </p>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.user.id}
                type="button"
                onClick={() => router.push(`/messages?user=${thread.user.id}`)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                  activeUserId === thread.user.id
                    ? "bg-primary/10 border border-primary/25 shadow-sm"
                    : "hover:bg-muted/60 border border-transparent"
                }`}
              >
                <img
                  src={getAvatarUrl(thread.user)}
                  alt={thread.user.name}
                  className="w-10 h-10 rounded-full bg-muted object-cover border border-border/60 shrink-0"
                />
                <div className="flex-1 overflow-hidden min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {thread.user.name}
                    </p>
                    {thread.unread_count > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
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

      {/* Active Conversation Panel (Visible on mobile only when thread is active; always visible on desktop) */}
      <Card
        className={`${
          activeUserId ? "flex" : "hidden md:flex"
        } flex-col flex-1 overflow-hidden glass-premium border-border/50 shadow-lg`}
      >
        {activeUserId ? (
          <>
            {/* Conversation Header with Mobile Back Button */}
            <div className="p-3 sm:p-4 border-b border-border/40 flex items-center justify-between gap-3 bg-card/40">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => router.push("/messages")}
                  className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Back to messages list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                {activeThread ? (
                  <>
                    <img
                      src={getAvatarUrl(activeThread.user)}
                      alt={activeThread.user.name}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted object-cover border border-border/60 shrink-0"
                    />
                    <div className="overflow-hidden min-w-0">
                      <h2 className="font-bold text-sm text-foreground truncate">
                        {activeThread.user.name}
                      </h2>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        {activeThread.user.role}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="h-10 flex items-center text-xs font-mono text-muted-foreground animate-pulse">
                    Connecting to user...
                  </div>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {loadingMessages && messages.length === 0 ? (
                <div className="text-center text-xs font-mono text-muted-foreground py-12 animate-pulse">
                  Retrieving conversation log...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-12 space-y-1">
                  <p className="font-semibold text-foreground">No message history</p>
                  <p className="text-[11px]">Send a greeting below to start collaborating!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user?.id;
                  const showAvatar =
                    !isMe &&
                    (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}
                    >
                      {!isMe && (
                        <div className="w-7 sm:w-8 shrink-0">
                          {showAvatar && activeThread && (
                            <img
                              src={getAvatarUrl(activeThread.user)}
                              alt="Avatar"
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted object-cover border border-border/40"
                            />
                          )}
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-sm leading-relaxed ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border border-border/60 text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div
                          className={`text-[9px] font-mono mt-1 text-right ${
                            isMe ? "text-primary-foreground/75" : "text-muted-foreground"
                          }`}
                        >
                          {formatDistanceToNow(
                            new Date(
                              msg.created_at.endsWith("Z")
                                ? msg.created_at
                                : msg.created_at + "Z"
                            ),
                            { addSuffix: true }
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer Form */}
            <form
              onSubmit={sendMessage}
              className="p-3 sm:p-4 border-t border-border/40 flex items-center gap-2 bg-card/25"
            >
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-background/50 border border-border/50 text-xs sm:text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim()}
                className="rounded-xl h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs p-6 space-y-2">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
            <p className="font-semibold text-foreground text-sm">Select a Conversation</p>
            <p className="text-[11px] max-w-xs text-center">
              Choose a developer from your inbox on the left to review message history and reply.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
