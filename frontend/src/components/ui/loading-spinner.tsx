import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  text?: string;
  minHeight?: string;
}

export function LoadingSpinner({ text = "Loading Workspace...", minHeight = "min-h-[400px]" }: LoadingSpinnerProps) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center ${minHeight} p-6 animate-in fade-in duration-300`}>
      <div className="relative flex flex-col items-center gap-4">
        {/* Glowing background aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-primary to-indigo-500/25 rounded-full blur-2xl opacity-50 dark:opacity-30"></div>
        
        {/* Main Spinner */}
        <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
        
        {/* Loading text */}
        {text && (
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase font-mono relative z-10 animate-pulse">
            {text}
          </span>
        )}
      </div>
    </div>
  );
}
