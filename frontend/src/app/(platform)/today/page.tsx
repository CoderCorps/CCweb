"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import DailyReportForm from "@/components/dashboard/DailyReportForm";
import { StuckFlagButton } from "@/components/tasks/stuck-flag-button";
import { PeerReviewPanel } from "@/components/dashboard/peer-review-panel";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Sun,
  Play,
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  FileText,
  Workflow
} from "lucide-react";

interface Project {
  id: number;
  title: string;
}

interface Task {
  id: number;
  title: string;
  sprint_id: number;
  project_id: number;
  project_title: string;
}

interface DailyTodo {
  id: number;
  description: string;
  status: "planned" | "in_progress" | "done" | "carried_over";
  task_id: number | null;
  source: string;
}

export default function StudentTodayPage() {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [todos, setTodos] = useState<DailyTodo[]>([]);

  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Unstarted Setup State
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [checkedTaskIds, setCheckedTaskIds] = useState<number[]>([]);
  const [customTodos, setCustomTodos] = useState<string[]>([]);
  const [newCustomText, setNewCustomText] = useState("");

  // Report Dialog State
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Time-based emphasis state (visual highlights after 4 PM local time)
  const [isPast4PM, setIsPast4PM] = useState(false);

  const checkTime = useCallback(() => {
    const hrs = new Date().getHours();
    setIsPast4PM(hrs >= 16);
  }, []);

  useEffect(() => {
    // Defer initial check to avoid synchronous setState during render/effect
    const initTimer = setTimeout(() => checkTime(), 0);
    const interval = setInterval(checkTime, 60000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [checkTime]);

  const loadTodayData = useCallback(async () => {
    if (!user) return;
    try {
      const todayStr = new Date().toISOString().split("T")[0];

      // 1. Fetch daily todos
      const todosRes = await api.get(`/daily/todos?date=${todayStr}`);
      if (todosRes.ok) {
        const todosData = await todosRes.json();
        setTodos(todosData);
        if (todosData.length > 0) {
          setStarted(true);
        }
      }

      // 2. Fetch daily reports to check if already submitted
      const reportRes = await api.get(`/daily/reports?date_from=${todayStr}&date_to=${todayStr}`);
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        if (reportData.length > 0) {
          setReportSubmitted(true);
        }
      }

      // 3. Fetch student active projects & assigned tasks
      const projRes = await api.get("/projects");
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
        if (projData.length > 0) {
          setSelectedProjectId(projData[0].id);

          // Get assigned tasks in active sprints
          const tasksList: Task[] = [];
          for (const p of projData) {
            const sprRes = await api.get(`/projects/${p.id}/sprints`);
            if (sprRes.ok) {
              const sprData = await sprRes.json();
              if (sprData.length > 0) {
                const latestSprint = sprData[sprData.length - 1];
                // Filter tasks assigned to current user
                latestSprint.tasks.forEach((t: any) => {
                  const isAssigned = t.assignments?.some((a: any) => a.user_id === user.id);
                  if (isAssigned && t.status !== "done") {
                    tasksList.push({
                      id: t.id,
                      title: t.title,
                      sprint_id: latestSprint.id,
                      project_id: p.id,
                      project_title: p.title
                    });
                  }
                });
              }
            }
          }
          setAssignedTasks(tasksList);
        }
      }
    } catch (err) {
      console.error("Failed to load today workspace data", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      loadTodayData();
    }, 0);
    return () => window.clearTimeout(initTimer);
  }, [loadTodayData]);

  // Handle checking/unchecking assigned tasks for setup checklist
  const handleToggleTaskCheck = (taskId: number) => {
    setCheckedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Add custom self-assigned todo to draft checklist
  const handleAddCustomTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomText.trim()) return;
    setCustomTodos((prev) => [...prev, newCustomText.trim()]);
    setNewCustomText("");
  };

  // Remove custom todo from draft list
  const handleRemoveCustomTodo = (index: number) => {
    setCustomTodos((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit day setup
  const handleStartDay = async () => {
    if (!selectedProjectId) return;
    setLoading(true);

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const payloadTodos: Array<{ task_id: number | null; description: string }> = [];

      // Add checked tasks
      assignedTasks.forEach((t) => {
        if (checkedTaskIds.includes(t.id)) {
          payloadTodos.push({
            task_id: t.id,
            description: t.title
          });
        }
      });

      // Add custom items
      customTodos.forEach((text) => {
        payloadTodos.push({
          task_id: null,
          description: text
        });
      });

      const res = await api.post("/daily/start-day", {
        project_id: Number(selectedProjectId),
        date: todayStr,
        todos: payloadTodos
      });

      if (res.ok) {
        loadTodayData();
      } else {
        toast.error("Failed to start day");
        setLoading(false);
      }
    } catch (err) {
      toast.error("Error starting day");
      setLoading(false);
    }
  };

  // Cycle todo statuses: planned -> in_progress -> done
  const handleCycleStatus = async (todoId: number, currentStatus: string) => {
    let nextStatus: DailyTodo["status"] = "planned";
    if (currentStatus === "planned") nextStatus = "in_progress";
    else if (currentStatus === "in_progress") nextStatus = "done";
    else if (currentStatus === "done") nextStatus = "planned";

    try {
      const res = await api.patch(`/daily/todos/${todoId}`, {
        status: nextStatus
      });
      if (res.ok) {
        // Optimistic state updates
        setTodos((prev) =>
          prev.map((t) => (t.id === todoId ? { ...t, status: nextStatus } : t))
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading Standup..." />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header bar */}
      <div className="glass-premium p-6 rounded-3xl border border-border/50 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl shadow-black/5 dark:shadow-black/20">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono tracking-wider uppercase animate-pulse">
              TODAY WORKSPACE
            </span>
            <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-md">
              Local Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Sun className="h-8 w-8 text-amber-500 dark:text-amber-400" style={{ animation: 'spin 12s linear infinite' }} /> 
            <span>Hello, <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">{user?.name}</span>!</span>
          </h1>
        </div>

        {/* Start Day / Report Submission triggers */}
        {started && (
          <div className="flex items-center gap-3 relative z-10 shrink-0">
            {reportSubmitted ? (
              <span className="text-xs font-bold px-4 py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-mono flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> REPORT SUBMITTED
              </span>
            ) : (
              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className={`font-bold gap-2 px-5 py-6 rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${isPast4PM
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-500/20 text-white animate-pulse border border-emerald-400/40"
                      : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-indigo-500/20 text-white"
                      }`}
                  >
                    <FileText className="h-5 w-5" /> Submit Daily Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-premium border-border/60 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DailyReportForm
                    todos={todos}
                    projectId={todos[0]?.id ? Number(selectedProjectId || projects[0]?.id) : 0}
                    onSuccess={() => {
                      setReportDialogOpen(false);
                      loadTodayData();
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace */}
      {!started ? (

        // UNSTARTED SETUP VIEW
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Select Project & Setup */}
          <div className="md:col-span-2 space-y-6">

            {/* Project selection card */}
            <Card className="glass-premium border-border/40 hover:border-border/80 transition-all duration-300 shadow-md hover:shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-md font-bold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-mono">1</span>
                  Select Target Project Stream
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground pl-8">
                  Pick the active project branch you will work on today.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-8">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  className="w-full h-11 rounded-xl border border-input bg-background/50 backdrop-blur-md px-3.5 text-sm shadow-inner text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-200"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-card text-foreground">{p.title}</option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Assigned sprint tickets card */}
            <Card className="glass-premium border-border/40 hover:border-border/80 transition-all duration-300 shadow-md hover:shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-md font-bold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-mono">2</span>
                  Choose Assigned Tickets
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground pl-8">
                  Select tickets assigned to you in active sprints that you plan to progress today.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[300px] overflow-y-auto pl-8 pr-4">
                {assignedTasks.length > 0 ? (
                  assignedTasks.map((t) => {
                    const isChecked = checkedTaskIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-300 select-none ${isChecked
                          ? "bg-primary/10 border-primary/40 text-foreground font-bold shadow-sm shadow-primary/5"
                          : "bg-background/30 hover:bg-background/50 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTaskCheck(t.id)}
                          className="rounded border-border/60 bg-background text-primary focus:ring-primary/40 focus:ring-offset-0 h-4.5 w-4.5 mt-0.5 cursor-pointer accent-primary"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-bold leading-relaxed">{t.title}</span>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-mono uppercase">
                              {t.project_title}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-2 border-dashed border-border/40 rounded-2xl bg-background/10">
                    <Workflow className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-xs font-medium">No active sprint tickets assigned to you.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Self added checklists */}
          <div className="md:col-span-1">
            <Card className="glass-premium border-border/40 hover:border-border/80 transition-all duration-300 shadow-md hover:shadow-lg flex flex-col h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-md font-bold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-mono">3</span>
                  Custom Tasks
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground pl-8">
                  Add non-sprint, administrative, or learning goals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow flex flex-col pl-8">

                {/* Custom list builder */}
                <form onSubmit={handleAddCustomTodo} className="flex gap-2">
                  <Input
                    placeholder="Refactor tests, write docs..."
                    value={newCustomText}
                    onChange={(e) => setNewCustomText(e.target.value)}
                    className="h-10 text-xs bg-background/30 border-border/50 rounded-xl focus-visible:ring-primary/40 focus-visible:ring-2"
                  />
                  <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground transition-all duration-200">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>

                {/* Custom items display */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[160px] min-h-[120px]">
                  {customTodos.map((text, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-background/25 border border-border/30 text-xs text-foreground group transition-all duration-150">
                      <span className="break-all pr-2 leading-relaxed">{text}</span>
                      <button
                        onClick={() => handleRemoveCustomTodo(idx)}
                        className="text-red-500 hover:text-red-400 font-extrabold px-1.5 text-base leading-none transition-colors duration-150"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {customTodos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 border border-dashed border-border/30 rounded-xl bg-background/5">
                      <p className="text-[10px] font-medium font-mono uppercase">Checklist empty</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleStartDay}
                  disabled={checkedTaskIds.length === 0 && customTodos.length === 0}
                  className="w-full py-6 rounded-2xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white gap-1.5 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none mt-auto"
                >
                  <Play className="h-4.5 w-4.5" /> Start My Day
                </Button>

              </CardContent>
            </Card>
          </div>

        </div>

      ) : (

        // STARTED TODAY CHECKLIST PROGRESS VIEW
        <Card className="glass-premium border-border/40 shadow-xl shadow-black/5 dark:shadow-black/25">
          <CardHeader className="pb-4 border-b border-border/30">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <CardTitle className="text-foreground text-lg font-black tracking-tight flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-indigo-500" />
                  Planned Checklist Progress
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Cycle through statuses (Planned ➔ In Progress ➔ Done) to track today&apos;s execution.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 font-mono shadow-inner shrink-0">
                <Clock className="h-4 w-4 animate-pulse" /> Checked in today
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {todos.map((todo) => {
              let statusText = "Planned";
              let statusColor = "text-muted-foreground bg-muted/50 border-border";
              let StatusIcon = Circle;
              let borderAccent = "border-l-4 border-l-slate-400 dark:border-l-slate-600";

              if (todo.status === "in_progress") {
                statusText = "In Progress";
                statusColor = "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
                StatusIcon = Clock;
                borderAccent = "border-l-4 border-l-cyan-500";
              } else if (todo.status === "done") {
                statusText = "Completed";
                statusColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                StatusIcon = CheckCircle2;
                borderAccent = "border-l-4 border-l-emerald-500";
              }

              return (
                <div
                  key={todo.id}
                  onClick={() => handleCycleStatus(todo.id, todo.status)}
                  className={`flex items-center justify-between p-4 rounded-2xl border border-border/40 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-md select-none ${todo.status === "done"
                    ? "bg-emerald-500/5 dark:bg-emerald-500/[0.02] text-muted-foreground/70 line-through font-normal"
                    : "bg-background/40 hover:bg-background/70 text-foreground font-semibold"
                    } ${borderAccent}`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                    <StatusIcon className={`h-5 w-5 shrink-0 ${todo.status === "done" ? "text-emerald-500 dark:text-emerald-400" : todo.status === "in_progress" ? "text-cyan-500 dark:text-cyan-400" : "text-muted-foreground"}`} />
                    <span className="text-sm leading-relaxed truncate">{todo.description}</span>
                  </div>

                  <div className="flex items-center gap-3.5 shrink-0">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full font-mono border uppercase tracking-wider ${statusColor}`}>
                      {statusText}
                    </span>
                    {todo.task_id && (
                      <div onClick={(e) => e.stopPropagation()} className="hover:scale-105 active:scale-95 transition-all">
                        <StuckFlagButton taskId={todo.task_id} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Peer Review Panel */}
      {started && <PeerReviewPanel />}

    </div>
  );
}
