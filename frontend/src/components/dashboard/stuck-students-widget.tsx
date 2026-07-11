"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Flag, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

export function StuckStudentsWidget() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStuckFlags();
  }, [user]);

  const fetchStuckFlags = async () => {
    if (!user) return;
    try {
      // First, get mentor projects
      const projRes = await api.get(`/mentors/${user.id}/projects`);
      if (projRes.ok) {
        const projects = await projRes.json();
        
        // Fetch stuck flags for all active projects
        let allFlags: any[] = [];
        for (const p of projects) {
          const res = await api.get(`/projects/${p.id}/stuck-flags`);
          if (res.ok) {
            const data = await res.json();
            // Inject project title for UI context
            const enriched = data.map((f: any) => ({ ...f, project_title: p.title }));
            allFlags = [...allFlags, ...enriched];
          }
        }
        
        // Sort by oldest first
        allFlags.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setFlags(allFlags);
      }
    } catch (err) {
      console.error("Failed to fetch stuck flags", err);
    } finally {
      setLoading(false);
    }
  };

  const resolveFlag = async (flagId: number) => {
    try {
      const res = await api.patch(`/stuck-flags/${flagId}/resolve`, {});
      if (res.ok) {
        setFlags(prev => prev.filter(f => f.id !== flagId));
      }
    } catch (err) {
      console.error("Failed to resolve stuck flag", err);
    }
  };

  if (loading) {
    return (
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle className="text-white text-md flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-400" /> Blocked Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-card rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (flags.length === 0) {
    return null; // Don't show the widget if no one is stuck!
  }

  return (
    <Card className="glass border-red-500/30">
      <CardHeader className="bg-red-500/5 pb-4">
        <CardTitle className="text-white text-md flex items-center gap-2">
          <Flag className="h-4 w-4 text-red-500" /> Action Required: Blocked Students ({flags.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 p-0">
        <div className="divide-y divide-border/40 max-h-[300px] overflow-y-auto">
          {flags.map((flag) => (
            <div key={flag.id} className="p-4 flex items-start gap-4 hover:bg-card/40 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-red-400">{flag.user.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">in {flag.project_title}</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  <strong>Task:</strong> {flag.task.title}
                </div>
                {flag.note && (
                  <div className="text-xs text-muted-foreground mt-1 italic border-l-2 border-red-500/30 pl-2">
                    "{flag.note}"
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                  Flagged {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => resolveFlag(flag.id)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
