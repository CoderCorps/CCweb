"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard,
  FolderGit2,
  UserCircle,
  Settings,
  ClipboardList,
  Users,
  Search,
  Terminal,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[]; // if set, only show for these roles
}

const ALL_COMMANDS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", description: "Engineering overview", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "projects", label: "Projects", description: "Labs workspace", href: "/projects", icon: <FolderGit2 className="h-4 w-4" /> },
  { id: "portfolio", label: "My Portfolio", description: "Edit your profile", href: "/portfolio", icon: <UserCircle className="h-4 w-4" /> },
  { id: "settings", label: "Settings", description: "Account & preferences", href: "/settings", icon: <Settings className="h-4 w-4" /> },
  { id: "reviews", label: "Reviews Board", description: "Pending submission reviews", href: "/mentor/reviews", icon: <ClipboardList className="h-4 w-4" />, roles: ["mentor", "admin"] },
  { id: "students", label: "Students Roster", description: "Assigned student list", href: "/mentor/students", icon: <Users className="h-4 w-4" />, roles: ["mentor", "admin"] },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const visible = ALL_COMMANDS.filter((cmd) => {
    if (cmd.roles && user && !cmd.roles.includes(user.role)) return false;
    if (!query) return true;
    return (
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      (cmd.description || "").toLowerCase().includes(query.toLowerCase())
    );
  });

  const navigate = (href: string) => {
    router.push(href);
    onClose();
    setQuery("");
    setSelected(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      if (visible[selected]) navigate(visible[selected].href);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette container */}
      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg shadow-2xl"
      >
        <div className="glass-premium border border-border/60 rounded-2xl overflow-hidden">
          {/* Search header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search commands..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
            />
            <kbd className="text-[10px] font-mono text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="py-2 max-h-80 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Terminal className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-mono">No commands found for &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              visible.map((cmd, i) => (
                <button
                  key={cmd.id}
                  id={`cmd-${cmd.id}`}
                  onClick={() => navigate(cmd.href)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selected === i
                      ? "bg-primary/10 border-l-2 border-l-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground border-l-2 border-l-transparent"
                  }`}
                >
                  <span className={selected === i ? "text-primary" : "text-muted-foreground"}>
                    {cmd.icon}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{cmd.label}</span>
                    {cmd.description && (
                      <span className="text-[11px] text-muted-foreground font-mono">{cmd.description}</span>
                    )}
                  </div>
                  {selected === i && (
                    <kbd className="ml-auto text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                      ↵
                    </kbd>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-border/40 flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
            <span><kbd className="bg-muted border border-border px-1 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="bg-muted border border-border px-1 rounded">↵</kbd> select</span>
            <span><kbd className="bg-muted border border-border px-1 rounded">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </>
  );
}
