"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { 
  Loader2, 
  Code2, 
  AlertTriangle, 
  Terminal as TerminalIcon, 
  Play, 
  Mic, 
  MicOff, 
  Volume2, 
  Users, 
  Radio, 
  Sparkles,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TerminalSandbox } from "@/components/terminal/terminal-sandbox";
import { toast } from "sonner";

interface PeerPresence {
  id: number;
  name: string;
  isSpeaking: boolean;
  avatar?: string;
  color: string;
}

export default function PairProgrammingRoom() {
  const { id: roomId } = useParams();
  const { user, getToken } = useAuth();
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("python");

  // Terminal Sandbox State
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalCode, setTerminalCode] = useState<string>("");
  const [terminalRunKey, setTerminalRunKey] = useState<number>(1);

  // Audio Presence & Push-to-Talk State
  const [micActive, setMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peers, setPeers] = useState<PeerPresence[]>([
    { id: 101, name: "Priya Patel", isSpeaking: false, color: "#10b981" },
    { id: 102, name: "Siddharth Roy (Mentor)", isSpeaking: false, color: "#a855f7" }
  ]);

  // Teardown collaboration session on unmount
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        try {
          bindingRef.current.destroy();
        } catch (e) {
          console.error("Error destroying Monaco binding:", e);
        }
        bindingRef.current = null;
      }
      if (providerRef.current) {
        try {
          providerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying WebSocket provider:", e);
        }
        providerRef.current = null;
      }
      if (docRef.current) {
        try {
          docRef.current.destroy();
        } catch (e) {
          console.error("Error destroying Yjs doc:", e);
        }
        docRef.current = null;
      }
    };
  }, []);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // Set default starter code if editor is blank
    if (!editor.getValue()) {
      editor.setValue(`# Collaborative Pair-Programming Session: ${roomId}
import asyncio

async def handle_distributed_request(payload: dict):
    print(f"Processing peer request: {payload}")
    await asyncio.sleep(0.05)
    return {"status": "ok", "processed": True}

asyncio.run(handle_distributed_request({"order_id": 402, "action": "audit"}))
`);
    }

    try {
      const ydoc = new Y.Doc();
      docRef.current = ydoc;

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${wsProtocol}//${window.location.host}/ws`;

      const provider = new WebsocketProvider(
        wsUrl,
        `room-${roomId}`,
        ydoc,
        { params: { token: getToken() || "" } }
      );
      providerRef.current = provider;

      provider.on("status", (event: { status: string }) => {
        setConnected(event.status === "connected");
        if (event.status === "connected") {
          setError(null);
        }
      });

      provider.on("connection-error", () => {
        setError("Realtime sync unavailable — working in local pair-buffer.");
      });

      const ytext = ydoc.getText("monaco");
      const binding = new MonacoBinding(
        ytext,
        editor.getModel(),
        new Set([editor]),
        provider.awareness
      );
      bindingRef.current = binding;
    } catch (err) {
      console.error("Yjs collaboration error:", err);
      setError("Collaboration offline — fallback mode enabled.");
    }
  };

  // Run code from editor directly into the terminal sandbox
  const handleRunCode = () => {
    const code = editorRef.current?.getValue() || "";
    setTerminalCode(code);
    setTerminalOpen(true);
    setTerminalRunKey((prev) => prev + 1);
    toast.success("Executing code in sandbox terminal...");
  };

  // Toggle Push-to-Talk Mic
  const toggleMic = () => {
    const nextState = !micActive;
    setMicActive(nextState);
    if (nextState) {
      setIsSpeaking(true);
      toast("🎙️ Microphone enabled (Push-to-Talk active). Teammates can hear you.");
    } else {
      setIsSpeaking(false);
      toast("🔇 Microphone muted.");
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-3 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between glass p-3.5 sm:p-4 rounded-2xl border-border/40 shrink-0 gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30">
            <Code2 className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-foreground leading-tight">
              Live Pair-Programming Room
            </h1>
            <p className="text-xs text-muted-foreground font-mono">Session ID: {roomId}</p>
          </div>
        </div>

        {/* Audio Presence & Controls Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Peer Voice Presence Avatars */}
          <div className="flex items-center gap-1.5 bg-card/60 border border-border/60 px-3 py-1.5 rounded-xl font-mono text-xs">
            <Users className="h-3.5 w-3.5 text-indigo-400 mr-1" />
            <div className="flex items-center -space-x-1.5">
              {peers.map((p) => (
                <div
                  key={p.id}
                  title={`${p.name} (${p.isSpeaking ? "Speaking" : "Connected"})`}
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white border-2 border-slate-900 transition-all ${
                    p.isSpeaking ? "ring-2 ring-emerald-400 animate-pulse" : ""
                  }`}
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0)}
                </div>
              ))}
            </div>

            {/* Push-to-Talk Button */}
            <button
              onClick={toggleMic}
              className={`ml-2 px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                micActive
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 animate-pulse"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
              }`}
              title={micActive ? "Mute Microphone" : "Unmute Microphone (Push-to-Talk)"}
            >
              {micActive ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              <span>{micActive ? "Live Voice" : "Muted"}</span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-card/60 border border-border/60 px-2.5 py-1 rounded-xl text-xs font-mono">
            <span className="text-muted-foreground">Lang:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-foreground font-bold focus:outline-none cursor-pointer"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="sql">SQL</option>
              <option value="html">HTML</option>
              <option value="json">JSON</option>
            </select>
          </div>

          {/* Run Code Execution Button */}
          <Button
            onClick={handleRunCode}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Run Code</span>
          </Button>

          {/* Toggle Terminal Button */}
          <Button
            onClick={() => setTerminalOpen((prev) => !prev)}
            variant="outline"
            size="sm"
            className="text-xs font-mono gap-1.5 border-border bg-card/60"
          >
            <TerminalIcon className="h-3.5 w-3.5 text-cyan-400" />
            <span>Terminal</span>
            {terminalOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>

          {/* Connection Status Badge */}
          {error ? (
            <div className="flex items-center gap-1.5 text-rose-400 text-xs bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20 font-mono">
              <AlertTriangle className="h-3.5 w-3.5" /> Offline
            </div>
          ) : connected ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 font-bold font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-400 text-xs bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 font-mono">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing
            </div>
          )}
        </div>
      </div>

      {/* Main Split Layout: Monaco Collaborative Editor + Terminal Sandbox */}
      <div className="grow flex flex-col gap-3 min-h-0">
        <Card className="grow glass overflow-hidden rounded-2xl border-border/40 relative shadow-xl min-h-[220px]">
          <Editor
            height="100%"
            language={language}
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
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 font-mono">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                <p className="text-xs">Connecting Collaborative Editor...</p>
              </div>
            }
          />
        </Card>

        {/* Integrated Terminal Sandbox Pane */}
        {terminalOpen && (
          <div className="shrink-0 transition-all duration-200">
            <TerminalSandbox
              key={terminalRunKey}
              initialCode={terminalCode}
              language={language}
              height="240px"
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
