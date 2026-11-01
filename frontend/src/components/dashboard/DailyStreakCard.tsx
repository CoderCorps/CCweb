"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Flame, Trophy, Check, Zap, Calendar } from "lucide-react";

interface DailyStreakCardProps {
  userId?: number;
  userName?: string;
  reportSubmitted?: boolean;
}

export function DailyStreakCard({ userId, userName = "Engineer", reportSubmitted = false }: DailyStreakCardProps) {
  const [streakDays, setStreakDays] = useState(3);
  const [multiplier, setMultiplier] = useState(1.15);

  useEffect(() => {
    try {
      const storageKey = `codercorps_streak_${userId || "default"}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStreakDays(parsed.days || 3);
      } else {
        // Seed initial streak for active student
        const initial = { days: 3, lastDate: new Date().toISOString().split("T")[0] };
        localStorage.setItem(storageKey, JSON.stringify(initial));
        setStreakDays(3);
      }
    } catch {}
  }, [userId]);

  // Adjust streak when report is submitted
  useEffect(() => {
    if (reportSubmitted) {
      setStreakDays((prev) => Math.max(prev, 4));
      setMultiplier(1.25);
    }
  }, [reportSubmitted]);

  // 7-day tracker representation
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Convert Sunday=0 to Monday=0

  return (
    <Card className="glass-premium border-border/50 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500 animate-pulse fill-amber-500/20" />
              <span>Standup Momentum</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Consistency awards XP multiplier bonuses.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-xs font-black shadow-sm">
            <Zap className="h-3.5 w-3.5 fill-amber-400" />
            <span>{multiplier}x XP BONUS</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Streak headline */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-foreground bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              {streakDays} DAYS
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase font-mono tracking-wider">
              ACTIVE STREAK
            </span>
          </div>

          <span className="text-[11px] font-mono text-indigo-400 flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" /> Next badge at 5 days
          </span>
        </div>

        {/* 7-Day Consistency Dots */}
        <div className="bg-background/40 p-3 rounded-2xl border border-border/40">
          <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Weekly Check-in Log
            </span>
            <span className="text-emerald-500 font-bold">{reportSubmitted ? "Today Verified ✓" : "Pending Check-in"}</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {daysOfWeek.map((day, idx) => {
              const isPast = idx < currentDayIndex;
              const isToday = idx === currentDayIndex;
              const isCompleted = isPast || (isToday && reportSubmitted);

              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] font-mono ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {day}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold shadow-sm"
                        : isToday
                        ? "bg-amber-500/20 border-2 border-amber-400 text-amber-400 animate-pulse"
                        : "bg-muted/40 border border-border/30 text-muted-foreground/30"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    ) : isToday ? (
                      <span className="text-[10px] font-mono font-bold">•</span>
                    ) : (
                      <span className="text-[9px] font-mono">·</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
