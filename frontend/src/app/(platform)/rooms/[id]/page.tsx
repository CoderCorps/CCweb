"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { Loader2, Code2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PairProgrammingRoom() {
  const { id: roomId } = useParams();
  const { user, getToken } = useAuth();
  const editorRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    const currentToken = getToken();
    if (!currentToken) return;

    try {
      const doc = new Y.Doc();
      const wsProvider = new WebsocketProvider(
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws",
        `yjs/${roomId}?token=${currentToken}`,
        doc
      );

      wsProvider.on("status", (event: { status: string }) => {
        if (event.status === "connected") {
          setConnected(true);
          setError(null);
        } else if (event.status === "disconnected") {
          setConnected(false);
        }
      });

      const ytext = doc.getText("monaco");
      // @ts-ignore
      const binding = new MonacoBinding(ytext, editorRef.current.getModel(), new Set([editorRef.current]), wsProvider.awareness);

      return () => {
        binding.destroy();
        wsProvider.destroy();
        doc.destroy();
      };
    } catch (err: any) {
      setError(err.message || "Failed to connect to collaboration server.");
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 max-w-7xl mx-auto animate-in fade-in duration-300">

      <div className="flex items-center justify-between glass p-4 rounded-xl border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
            <Code2 className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Live Pair-Programming Room</h1>
            <p className="text-xs text-muted-foreground">Session ID: {roomId}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {error ? (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          ) : connected ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 font-medium">
              <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
            </div>
          )}
        </div>
      </div>

      <Card className="grow glass overflow-hidden rounded-xl border-border/40 relative">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "JetBrains Mono, monospace",
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            formatOnPaste: true,
          }}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p>Initializing Collaborative Editor...</p>
            </div>
          }
        />
      </Card>

    </div>
  );
}
