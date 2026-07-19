"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Terminal, Play, Video, Wifi, WifiOff } from "lucide-react";

export default function PairProgrammingRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const editorRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [peersCount, setPeersCount] = useState(1);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.disconnect();
      }
    };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Initialize Yjs CRDT Document
    const doc = new Y.Doc();
    const type = doc.getText("monaco");

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    let wsHost = "";
    
    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      const isSecure = (typeof window !== "undefined" && window.location.protocol === "https:") || apiBase.startsWith("https");
      const proto = isSecure ? "wss" : "ws";
      let host = apiBase.replace(/^https?:\/\//, "").replace(/\/+$/, "").replace(/\/api\/v1$/, "");
      wsHost = `${proto}://${host}`;
    } else {
      const proto = (typeof window !== "undefined" && window.location.protocol === "https:") ? "wss" : "ws";
      const host = typeof window !== "undefined" ? window.location.host : "localhost:8000";
      let basePath = apiBase.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
      wsHost = `${proto}://${host}${basePath}`;
    }

    const provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WS_URL || wsHost,
      `ws/yjs/${id}`,
      doc
    );
    providerRef.current = provider;

    provider.on("status", (event: { status: string }) => {
      setConnected(event.status === "connected");
    });

    provider.awareness.on("change", () => {
      setPeersCount(provider.awareness.getStates().size);
    });

    // Set cursor and user info for awareness
    provider.awareness.setLocalStateField("user", {
      name: user?.name || "Anonymous",
      color: "#" + Math.floor(Math.random()*16777215).toString(16)
    });

    // Bind Yjs to Monaco
    const binding = new MonacoBinding(
      type, 
      editor.getModel(), 
      new Set([editor]), 
      provider.awareness
    );
  };

  return (
    <div className="h-[calc(100vh-80px)] max-w-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header Toolbar */}
      <div className="glass px-4 py-3 border-b border-border/40 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-white/10"
            onClick={() => router.push(`/projects/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              Live Pair-Programming Session
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-card rounded-md border border-border/60">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-mono font-bold text-white">{peersCount} Online</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-card rounded-md border border-border/60">
            {connected ? (
              <><Wifi className="h-3.5 w-3.5 text-emerald-400" /> <span className="text-xs font-mono text-emerald-400">Synced</span></>
            ) : (
              <><WifiOff className="h-3.5 w-3.5 text-red-400" /> <span className="text-xs font-mono text-red-400">Disconnected</span></>
            )}
          </div>

          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 font-bold h-8 text-xs gap-1.5">
            <Play className="h-3.5 w-3.5" /> Run Code
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
            <Video className="h-3.5 w-3.5" /> Start Audio/Video
          </Button>
        </div>
      </div>

      {/* Editor Space */}
      <div className="flex-grow flex w-full h-full relative">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          defaultValue="// Welcome to the Live Pair-Programming Room!\n// Code here is synced in real-time using CRDTs (Yjs)."
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            formatOnPaste: true,
          }}
        />
      </div>
    </div>
  );
}
