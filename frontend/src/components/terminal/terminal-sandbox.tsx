"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Terminal as TerminalIcon, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Sparkles,
  Command,
  HelpCircle,
  FolderGit2
} from "lucide-react";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "info" | "success";
  text: string;
}

interface TerminalSandboxProps {
  initialCode?: string;
  language?: string;
  height?: string | number;
  className?: string;
  onCodeRun?: (code: string) => void;
}

export function TerminalSandbox({
  initialCode = "",
  language = "python",
  height = "360px",
  className = "",
  onCodeRun,
}: TerminalSandboxProps) {
  const [history, setHistory] = useState<TerminalLine[]>([
    {
      id: "welcome-1",
      type: "info",
      text: "CoderCorps Cloud Sandbox Runtime v2.4 (Ubuntu 24.04 LTS x86_64)",
    },
    {
      id: "welcome-2",
      type: "info",
      text: "Interactive container session connected. Type 'help' to inspect available tools.",
    },
    {
      id: "welcome-3",
      type: "success",
      text: "✓ Environment ready: Python 3.12, Node.js 22, Docker Engine, Git 2.44",
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of terminal when history changes
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const executeCommand = (cmdRaw: string) => {
    const cmd = cmdRaw.trim();
    if (!cmd) return;

    const newId = `${Date.now()}-${Math.random()}`;

    // Add command to terminal history
    const newHistory: TerminalLine[] = [
      ...history,
      { id: newId, type: "input", text: `codercorps@sandbox:~/workspace$ ${cmd}` },
    ];

    // Add to navigation history
    setCmdHistory((prev) => [cmd, ...prev]);
    setHistoryIdx(-1);

    const parts = cmd.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case "help":
        newHistory.push({
          id: `${newId}-out`,
          type: "info",
          text: `CoderCorps Sandbox Shell Commands:
  run, python [file]   - Execute active editor code in isolated VM
  pytest, test         - Run test suite with assertion reporting & coverage
  git status           - Show working branch and staged commit status
  git log              - View recent commit log on current branch
  git commit -m "..."  - Stage and create a simulated git commit
  docker ps            - List running cloud service containers (Postgres, Redis)
  ls, dir              - List workspace files and directories
  cat <file>           - Print contents of a file
  whoami               - Print authenticated developer session info
  env                  - List active sandbox environment variables
  clear                - Clear terminal window buffer
  echo [text]          - Print text to stdout`,
        });
        break;

      case "clear":
      case "cls":
        setHistory([]);
        return;

      case "run":
      case "python":
      case "node":
      case "python3":
        setIsRunning(true);
        newHistory.push({
          id: `${newId}-run`,
          type: "info",
          text: `[Sandbox Engine] Compiling & launching process: ${language} ...`,
        });

        setTimeout(() => {
          setIsRunning(false);
          if (onCodeRun && initialCode) {
            onCodeRun(initialCode);
          }

          // Evaluate simulated or actual code
          if (initialCode && initialCode.includes("print(")) {
            const matches = initialCode.match(/print\((["'])(.*?)\1\)/g);
            if (matches) {
              matches.forEach((m, idx) => {
                const cleaned = m.replace(/^print\((["'])/, "").replace(/(["'])\)$/, "");
                newHistory.push({
                  id: `${newId}-stdout-${idx}`,
                  type: "output",
                  text: cleaned,
                });
              });
            } else {
              newHistory.push({
                id: `${newId}-out`,
                type: "success",
                text: "Process finished with exit code 0 (execution time: 42ms)",
              });
            }
          } else {
            newHistory.push(
              { id: `${newId}-out1`, type: "output", text: "Initializing Distributed E-Commerce Services..." },
              { id: `${newId}-out2`, type: "output", text: "✓ Database connection pool established: postgresql://admin:***@localhost:5432/codercorps" },
              { id: `${newId}-out3`, type: "output", text: "✓ Redis client connected at redis://127.0.0.1:6379" },
              { id: `${newId}-out4`, type: "success", text: "✓ Server listening on http://0.0.0.0:8000 (Ready for requests)" }
            );
          }
          setHistory([...newHistory]);
        }, 500);
        return;

      case "pytest":
      case "test":
        setIsRunning(true);
        newHistory.push({
          id: `${newId}-test`,
          type: "info",
          text: "============================= test session starts =============================\nplatform linux -- Python 3.12.2, pytest-8.1.1, pluggy-1.4.0\nrootdir: /home/codercorps/workspace, configfile: pytest.ini\ncollected 4 items",
        });

        setTimeout(() => {
          setIsRunning(false);
          newHistory.push(
            { id: `${newId}-t1`, type: "success", text: "tests/test_auth.py::test_jwt_signature_verification PASSED    [ 25%]" },
            { id: `${newId}-t2`, type: "success", text: "tests/test_orders.py::test_create_order_atomic_rollback PASSED [ 50%]" },
            { id: `${newId}-t3`, type: "success", text: "tests/test_stripe.py::test_idempotency_duplicate_key PASSED  [ 75%]" },
            { id: `${newId}-t4`, type: "success", text: "tests/test_cache.py::test_redis_write_through_ttl PASSED      [100%]" },
            { id: `${newId}-cov`, type: "info", text: "\n---------- coverage: platform linux, python 3.12.2 -----------\nName                               Stmts   Miss  Cover\n------------------------------------------------------\nsrc/services/stripe_webhook.py        38      2    95%\nsrc/services/cache_service.py         24      1    96%\nsrc/models/order.py                   42      1    98%\n------------------------------------------------------\nTOTAL                                104      4    96%" },
            { id: `${newId}-t5`, type: "success", text: "\n========================= 4 passed in 0.38s ==========================" }
          );
          setHistory([...newHistory]);
        }, 600);
        return;

      case "git":
        const sub = args[0];
        if (sub === "status") {
          newHistory.push({
            id: `${newId}-git`,
            type: "info",
            text: `On branch feature/payment-idempotency
Your branch is up to date with 'origin/feature/payment-idempotency'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
	modified:   src/services/stripe_webhook.py
	modified:   tests/test_stripe.py

no changes added to commit (use "git add")`,
          });
        } else if (sub === "log") {
          newHistory.push({
            id: `${newId}-git`,
            type: "info",
            text: `commit 7a2b9f1d04e4c22b95fa8e019385ab04c99e912f (HEAD -> feature/payment-idempotency)
Author: Student Developer <student@codercorps.com>
Date:   Today 14:22:10 +0530

    feat: add atomic transaction idempotency key check in Stripe webhook

commit 3c8e4a9012bb59dfa120491290bb34812f00a912 (origin/main, main)
Author: Siddharth Roy <siddharth@codercorps.com>
Date:   Yesterday 18:30:00 +0530

    chore: base project skeleton and sqlalchemy models`,
          });
        } else if (sub === "commit") {
          const msg = args.slice(1).join(" ") || "update task deliverables";
          newHistory.push({
            id: `${newId}-git`,
            type: "success",
            text: `[feature/payment-idempotency 9b4e1a2] ${msg.replace(/["']/g, "")}\n 2 files changed, 18 insertions(+), 3 deletions(-)`,
          });
        } else {
          newHistory.push({
            id: `${newId}-git`,
            type: "output",
            text: `git version 2.44.0. Try 'git status', 'git log', or 'git commit -m "..."'`,
          });
        }
        break;

      case "docker":
        if (args[0] === "ps") {
          newHistory.push({
            id: `${newId}-doc`,
            type: "info",
            text: `CONTAINER ID   IMAGE                 COMMAND                  STATUS         PORTS                    NAMES
e4f910a2b89c   postgres:16-alpine    "docker-entrypoint.s…"   Up 2 hours     0.0.0.0:5432->5432/tcp   codercorps-postgres
a1b2c3d4e5f6   redis:7-alpine        "docker-entrypoint.s…"   Up 2 hours     0.0.0.0:6379->6379/tcp   codercorps-redis
89a0b1c2d3e4   codercorps/api:dev    "uvicorn app.main:ap…"   Up 2 hours     0.0.0.0:8000->8000/tcp   codercorps-api`,
          });
        } else {
          newHistory.push({
            id: `${newId}-doc`,
            type: "output",
            text: `Docker version 25.0.3. Try 'docker ps'.`,
          });
        }
        break;

      case "ls":
      case "dir":
        newHistory.push({
          id: `${newId}-ls`,
          type: "output",
          text: `src/          tests/        alembic/      requirements.txt
README.md     Dockerfile    pytest.ini    docker-compose.yml`,
        });
        break;

      case "whoami":
        newHistory.push({
          id: `${newId}-whoami`,
          type: "success",
          text: "student@codercorps-sandbox (Role: Student Developer, Cohort: Alpha-2026)",
        });
        break;

      case "env":
        newHistory.push({
          id: `${newId}-env`,
          type: "output",
          text: `USER=student
HOME=/home/codercorps
SHELL=/bin/zsh
LANG=en_US.UTF-8
CODERCORPS_ENV=sandbox
PYTHON_VERSION=3.12.2
NODE_VERSION=22.0.0
DB_URL=postgresql://admin:secret@localhost:5432/codercorps`,
        });
        break;

      case "echo":
        newHistory.push({
          id: `${newId}-echo`,
          type: "output",
          text: args.join(" ").replace(/["']/g, ""),
        });
        break;

      default:
        newHistory.push({
          id: `${newId}-err`,
          type: "error",
          text: `zsh: command not found: ${command}. Type 'help' for supported commands.`,
        });
        break;
    }

    setHistory(newHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputVal);
      setInputVal("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
        setHistoryIdx(nextIdx);
        setInputVal(cmdHistory[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(cmdHistory[nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal("");
      }
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setHistory([]);
    }
  };

  const copyTerminalOutput = () => {
    const raw = history.map((h) => h.text).join("\n");
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-950 flex flex-col font-mono text-xs overflow-hidden shadow-2xl transition-all duration-200 ${
        isMaximized
          ? "fixed inset-4 z-50 h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]"
          : className
      }`}
      style={!isMaximized ? { height } : undefined}
    >
      {/* Terminal Titlebar Chrome */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          {/* macOS Style Traffic Dots */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <TerminalIcon className="h-4 w-4 text-indigo-400" />
          <span className="font-bold text-slate-300 text-[11px] truncate">
            codercorps-shell -- sandbox: student@codercorps-vm
          </span>
        </div>

        {/* Quick Actions & Window Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => executeCommand("run")}
            disabled={isRunning}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer"
            title="Execute Code (run)"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Run</span>
          </button>

          <button
            onClick={() => executeCommand("pytest")}
            disabled={isRunning}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold transition-colors cursor-pointer"
            title="Run Pytest Test Suite"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Pytest</span>
          </button>

          <button
            onClick={() => executeCommand("git status")}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
            title="Git Status"
          >
            <FolderGit2 className="h-3 w-3" />
            <span>Git</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={copyTerminalOutput}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Copy Output"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={() => setHistory([])}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Clear Buffer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsMaximized((prev) => !prev)}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isMaximized ? "Restore Window" : "Maximize Window"}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div 
        onClick={() => inputRef.current?.focus()}
        className="flex-1 p-4 overflow-y-auto space-y-1.5 cursor-text bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900/50"
      >
        {history.map((line) => (
          <div key={line.id} className="leading-relaxed whitespace-pre-wrap break-all">
            {line.type === "input" && (
              <span className="text-indigo-400 font-bold">{line.text}</span>
            )}
            {line.type === "info" && (
              <span className="text-slate-400">{line.text}</span>
            )}
            {line.type === "success" && (
              <span className="text-emerald-400 font-bold">{line.text}</span>
            )}
            {line.type === "error" && (
              <span className="text-rose-400 font-bold">{line.text}</span>
            )}
            {line.type === "output" && (
              <span className="text-slate-200">{line.text}</span>
            )}
          </div>
        ))}

        {isRunning && (
          <div className="flex items-center gap-2 text-indigo-400 animate-pulse pt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Executing process in sandbox...</span>
          </div>
        )}

        {/* Live Shell Input Line */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-emerald-400 font-bold select-none shrink-0">
            codercorps@sandbox:~/workspace$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type 'help', 'run', or 'pytest'..."
            className="flex-1 bg-transparent text-slate-100 focus:outline-none placeholder:text-slate-600 font-mono text-xs"
            autoFocus
          />
        </div>

        <div ref={terminalEndRef} />
      </div>

      {/* Footer Status Strip */}
      <div className="px-4 py-1.5 bg-slate-900/90 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between select-none font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Online Sandbox
          </span>
          <span>Buffer: {history.length} lines</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>Ctrl+L: Clear</span>
          <span>Up/Down: History</span>
        </div>
      </div>
    </div>
  );
}
