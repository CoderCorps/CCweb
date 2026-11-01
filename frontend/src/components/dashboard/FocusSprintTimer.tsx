"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Flame, Sparkles, CheckCircle2, Coffee, Zap } from "lucide-react";
import { playSuccessChime, triggerConfetti } from "@/lib/celebrate";
import { toast } from "sonner";

interface FocusSprintTimerProps {
  todos?: Array<{ id: number; description: string; status: string }>;
  userName?: string;
}

export function FocusSprintTimer({ todos = [], userName = "Developer" }: FocusSprintTimerProps) {
  // Modes: 25min standard, 50min deep focus, 5min quick break
  const [mode, setMode] = useState<"25" | "50" | "5">("25");
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [sprintsCompletedToday, setSprintsCompletedToday] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load completed sprint count from localStorage
  useEffect(() => {
    try {
      const todayKey = `codercorps_sprints_${new Date().toISOString().split("T")[0]}`;
      const saved = localStorage.getItem(todayKey);
      if (saved) {
        setSprintsCompletedToday(parseInt(saved, 10));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Set default selected task if todos arrive
  useEffect(() => {
    if (!selectedTask && todos.length > 0) {
      const inProgress = todos.find((t) => t.status === "in_progress");
      setSelectedTask(inProgress?.description || todos[0]?.description || "");
    }
  }, [todos, selectedTask]);

  // Handle mode switch
  const switchMode = (newMode: "25" | "50" | "5") => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setMode(newMode);
    const secs = parseInt(newMode, 10) * 60;
    setTotalSeconds(secs);
    setSecondsLeft(secs);
  };

  // Timer tick effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsRunning(false);

            // Celebration on finish
            if (mode !== "5") {
              playSuccessChime();
              triggerConfetti();
              const newCount = sprintsCompletedToday + 1;
              setSprintsCompletedToday(newCount);
              try {
                const todayKey = `codercorps_sprints_${new Date().toISOString().split("T")[0]}`;
                localStorage.setItem(todayKey, String(newCount));
              } catch {}
              toast.success(`🎯 Focus Sprint Completed! +30 XP! Outstanding focus!`);
            } else {
              playSuccessChime();
              toast.info(`☕ Break finished! Ready for the next deep work sprint?`);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, sprintsCompletedToday]);

  const toggleTimer = () => setIsRunning((prev) => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(totalSeconds);
  };

  // Time calculations
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // SVG Circular progress
  const progressPercent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const isBreak = mode === "5";

  return (
    <Card className="glass-premium border-border/50 shadow-xl relative overflow-hidden">
      {/* Background radial glow */}
      <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
        isBreak ? "bg-emerald-500/10" : isRunning ? "bg-indigo-500/15" : "bg-purple-500/10"
      }`} />

      <CardHeader className="pb-2 border-b border-border/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Zap className={`h-4 w-4 ${isRunning ? "text-amber-400 animate-bounce" : "text-indigo-400"}`} />
              <span>Deep Work Sprint Engine</span>
              {isRunning && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Boost your cognitive flow with timed interval sprints.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>{sprintsCompletedToday} Sprints Completed</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Sprint Mode Selector */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => switchMode("25")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 ${
              mode === "25"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            25m Sprint
          </button>
          <button
            type="button"
            onClick={() => switchMode("50")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 ${
              mode === "50"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20 scale-105"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            50m Deep Flow
          </button>
          <button
            type="button"
            onClick={() => switchMode("5")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center gap-1 ${
              mode === "5"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-105"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Coffee className="h-3 w-3" />
            5m Rest
          </button>
        </div>

        {/* Circular Progress & Clock */}
        <div className="flex flex-col items-center justify-center py-2 relative">
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r={radius}
                className="stroke-muted/40"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="88"
                cy="88"
                r={radius}
                stroke={isBreak ? "#10b981" : "#6366f1"}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-linear"
                fill="transparent"
              />
            </svg>

            {/* Inner Clock Text */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-black font-mono tracking-tight text-foreground">
                {formattedTime}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                {isBreak ? "Break Time" : isRunning ? "In Focus" : "Paused"}
              </span>
            </div>
          </div>
        </div>

        {/* Target Task Selector */}
        {!isBreak && todos.length > 0 && (
          <div className="space-y-1.5 bg-background/40 p-3 rounded-2xl border border-border/40">
            <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-400" /> Focus Target Task:
            </label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary truncate"
            >
              {todos.map((todo) => (
                <option key={todo.id} value={todo.description}>
                  {todo.status === "done" ? "✓ " : "• "} {todo.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Timer Control Buttons */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button
            type="button"
            onClick={toggleTimer}
            className={`font-bold px-7 py-5 rounded-2xl text-white shadow-lg transition-all duration-200 flex items-center gap-2 active:scale-95 ${
              isRunning
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                : isBreak
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4" /> Pause Focus
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" /> Start Sprint
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={resetTimer}
            className="p-3 h-auto rounded-2xl border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Reset Timer"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
