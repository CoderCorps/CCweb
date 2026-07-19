"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useApprovalThreadStore } from "@/stores";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function ApprovalThreadPage({ params }: { params: { id: string } }) {
  const projectId = parseInt(params.id);
  const { user } = useAuth();
  const { messages, setMessages, connect, disconnect, sendMessage, isConnected } = useApprovalThreadStore();
  const [project, setProject] = useState<any>(null);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProjectAndMessages = async () => {
      try {
        const [projRes, msgRes] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/projects/${projectId}/approval-thread`)
        ]);
        
        if (projRes.ok) {
          setProject(await projRes.json());
        }
        if (msgRes.ok) {
          setMessages(await msgRes.json());
        } else {
          alert("Failed to load discussion thread");
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchProjectAndMessages();
    connect(projectId);

    return () => {
      disconnect();
    };
  }, [projectId, connect, disconnect, setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue("");
  };

  if (!project) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-6 max-w-4xl mx-auto w-full">
      <div className="mb-4">
        <Link href={user?.role === "admin" ? "/admin/projects/pending" : "/projects"}>
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          Discussion: {project.title}
          <ShieldAlert className="w-5 h-5 text-amber-500" />
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Private thread between Mentor and Administrators regarding project approval.
        </p>
      </div>

      <Card className="flex flex-col flex-grow overflow-hidden border-2">
        <CardHeader className="bg-muted/30 border-b py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Live Chat
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-xs text-muted-foreground">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.user_id === user?.id;
              const isAdmin = msg.user_role === "admin";
              
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{isMe ? "You" : msg.user_name}</span>
                    {isAdmin && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>}
                  </div>
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : isAdmin 
                        ? 'bg-amber-500/10 border border-amber-500/20 rounded-tl-sm'
                        : 'bg-muted rounded-tl-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
        
        <CardFooter className="p-3 bg-muted/20 border-t">
          <form onSubmit={handleSend} className="flex w-full gap-2">
            <Input 
              placeholder="Type your message..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!isConnected}
              className="flex-grow"
            />
            <Button type="submit" disabled={!isConnected || !inputValue.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
