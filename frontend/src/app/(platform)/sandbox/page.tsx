"use client";

import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { TerminalSandbox } from "@/components/terminal/terminal-sandbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  CheckCircle2, 
  RotateCcw, 
  Terminal as TerminalIcon, 
  Sparkles, 
  Layers, 
  FileCode,
  ShieldCheck
} from "lucide-react";

interface CodeTemplate {
  name: string;
  language: string;
  filename: string;
  code: string;
}

const TEMPLATES: Record<string, CodeTemplate> = {
  python: {
    name: "Python 3.12 (FastAPI & AsyncIO)",
    language: "python",
    filename: "main.py",
    code: `import asyncio
from datetime import datetime

async def process_payment_webhook(event_id: str, amount_cents: int):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Received webhook event: {event_id}")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Verifying Stripe HMAC-SHA256 signature...")
    await asyncio.sleep(0.05)
    
    # Atomic transaction insert
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Deduplicating against Postgres idempotency store...")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] SUCCESS: Order processed for $\${amount_cents / 100:.2f}")
    return {"status": "success", "event_id": event_id}

async def main():
    print("=== CoderCorps Cloud Runtime Initialized ===")
    res = await process_payment_webhook("evt_99812_charge", 4999)
    print("Execution complete: " + str(res))

if __name__ == "__main__":
    asyncio.run(main())
`,
  },
  typescript: {
    name: "TypeScript (React 19 & Next.js)",
    language: "typescript",
    filename: "service.ts",
    code: `interface SprintTask {
  id: number;
  title: string;
  status: "todo" | "in_progress" | "review" | "done";
  skillPoints: number;
}

function calculateTeamVelocity(tasks: SprintTask[]): { completedPoints: number; velocityRate: string } {
  console.log("Analyzing sprint task deliverables...");
  const completed = tasks.filter(t => t.status === "done");
  const totalPoints = completed.reduce((acc, t) => acc + t.skillPoints, 0);
  const velocity = ((completed.length / tasks.length) * 100).toFixed(1) + "%";

  console.log(\`Processed \${tasks.length} tasks. Total velocity: \${velocity}\`);
  return { completedPoints: totalPoints, velocityRate: velocity };
}

const sampleSprint: SprintTask[] = [
  { id: 1, title: "Stripe Webhook Idempotency", status: "done", skillPoints: 90 },
  { id: 2, title: "Redis Cache Layer", status: "done", skillPoints: 75 },
  { id: 3, title: "CI Flaky Test Detector", status: "review", skillPoints: 60 }
];

console.log(calculateTeamVelocity(sampleSprint));
`,
  },
  sql: {
    name: "SQL (PostgreSQL Distributed Schema)",
    language: "sql",
    filename: "schema.sql",
    code: `-- CoderCorps Production Capstone Schema
CREATE TABLE IF NOT EXISTS processed_webhooks (
    event_id VARCHAR(120) PRIMARY KEY,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'processed'
);

CREATE INDEX idx_webhooks_status ON processed_webhooks(status);

SELECT event_id, status, received_at 
FROM processed_webhooks 
ORDER BY received_at DESC 
LIMIT 10;
`,
  },
};

export default function SandboxPlaygroundPage() {
  const [selectedKey, setSelectedKey] = useState<string>("python");
  const [activeCode, setActiveCode] = useState<string>(TEMPLATES.python.code);
  const [terminalKey, setTerminalKey] = useState<number>(1);

  const currentTemplate = TEMPLATES[selectedKey];

  const handleSelectTemplate = (key: string) => {
    setSelectedKey(key);
    setActiveCode(TEMPLATES[key].code);
  };

  const handleResetCode = () => {
    setActiveCode(currentTemplate.code);
  };

  const handleTriggerRun = () => {
    // Triggers execution by updating key or calling terminal
    setTerminalKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-foreground font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-xs font-bold mb-2 border border-indigo-500/20">
            <TerminalIcon className="h-3.5 w-3.5 text-cyan-400" />
            <span>CLOUD SANDBOX RUNTIME</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Student Interactive Shell &amp; Playground
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Safely test algorithms, execute test suites, inspect git branches, and evaluate backend scripts in an isolated container sandbox.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            onClick={handleTriggerRun}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Run Code</span>
          </Button>

          <Button
            onClick={handleResetCode}
            variant="outline"
            className="text-xs font-mono gap-1.5 border-border"
            title="Reset to template defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* Template Preset Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Object.entries(TEMPLATES).map(([key, item]) => (
          <button
            key={key}
            onClick={() => handleSelectTemplate(key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              selectedKey === key
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>

      {/* Split Workspace Layout: Monaco Editor & Terminal Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Monaco Editor */}
        <Card className="lg:col-span-7 glass border-border/40 overflow-hidden flex flex-col shadow-xl">
          <CardHeader className="py-2.5 px-4 bg-slate-900 border-b border-border/30 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <CardTitle className="text-xs font-mono text-slate-300">
                workspace/{currentTemplate.filename}
              </CardTitle>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {currentTemplate.language}
            </span>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-[380px] lg:min-h-[460px]">
            <Editor
              height="100%"
              language={currentTemplate.language}
              value={activeCode}
              onChange={(val) => setActiveCode(val || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "JetBrains Mono, monospace",
                padding: { top: 12 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                formatOnPaste: true,
              }}
            />
          </CardContent>
        </Card>

        {/* Right: Embedded Interactive Terminal Sandbox */}
        <div className="lg:col-span-5 flex flex-col">
          <TerminalSandbox
            key={terminalKey}
            initialCode={activeCode}
            language={currentTemplate.language}
            height="100%"
            className="flex-1 min-h-[380px] lg:min-h-[460px]"
          />
        </div>
      </div>
    </div>
  );
}
