"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StuckFlagButtonProps {
  taskId: number;
  initialIsStuck?: boolean;
}

export function StuckFlagButton({ taskId, initialIsStuck = false }: StuckFlagButtonProps) {
  const [isStuck, setIsStuck] = useState(initialIsStuck);
  const [loading, setLoading] = useState(false);

  const toggleStuck = async () => {
    setLoading(true);
    try {
      if (isStuck) {
        // Assume backend resolves it if POST is called again, or we might need a dedicated DELETE / resolve endpoint.
        // Based on the spec: POST /tasks/{id}/stuck creates a stuck flag. 
        // We'll just POST it to flag, and maybe mentor resolves it. If student clicks it again, they might add another note or resolve it.
        // For simplicity, let's just make it a one-way flag for the student, or assume the backend toggles it.
        // Actually, let's call it 'Flag as stuck' and if it's already stuck, maybe say 'Currently Stuck'.
        alert("You have already flagged this as stuck. A mentor will review it shortly.");
      } else {
        const note = prompt("Optional: Briefly describe what you are stuck on.");
        if (note !== null) {
          const res = await api.post(`/tasks/${taskId}/stuck`, { note });
          if (res.ok) {
            setIsStuck(true);
          }
        }
      }
    } catch (err) {
      console.error("Failed to flag task", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={toggleStuck} 
      disabled={loading || isStuck}
      variant={isStuck ? "destructive" : "outline"}
      size="sm"
      className={`text-xs gap-1.5 h-7 px-2 ${isStuck ? "bg-red-500/20 text-red-400 border-red-500/30" : "text-slate-400 hover:text-red-400 hover:bg-red-500/10 border-border/60"}`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Flag className="h-3 w-3" />
      )}
      {isStuck ? "Flagged Stuck" : "Flag as Stuck"}
    </Button>
  );
}
