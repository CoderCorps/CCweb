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
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-card rounded-xl" />
        <div className="h-100 bg-card rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">

      {/* Header bar */}
      <div className="glass px-6 py-5 rounded-2xl border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">TODAY WORKSPACE</span>
            <span className="text-[10px] font-mono text-slate-400">Local Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Sun className="h-6 w-6 text-amber-400" /> Hello, {user?.name}!
          </h1>
        </div>

        {/* Start Day / Report Submission triggers */}
        {started && (
          <div className="flex items-center gap-3">
            {reportSubmitted ? (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> REPORT SUBMITTED
              </span>
            ) : (
              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className={`font-semibold gap-1.5 shadow-lg transition-all duration-300 ${isPast4PM
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse scale-105 border border-emerald-400/50"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                  >
                    <FileText className="h-4 w-4" /> Submit Daily Report
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
            <Card className="glass border-border/40">
              <CardHeader>
                <CardTitle className="text-white text-md">1. Select Target Project Stream</CardTitle>
                <CardDescription className="text-xs">
                  Pick the active project branch you will work on today.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm shadow-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-card text-foreground">{p.title}</option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Assigned sprint tickets card */}
            <Card className="glass border-border/40">
              <CardHeader>
                <CardTitle className="text-white text-md">2. Choose Assigned Tickets</CardTitle>
                <CardDescription className="text-xs">
                  Select tickets assigned to you in active sprints that you plan to progress today.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 max-h-75 overflow-y-auto">
                {assignedTasks.length > 0 ? (
                  assignedTasks.map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${checkedTaskIds.includes(t.id)
                        ? "bg-indigo-600/10 border-indigo-500/50 text-white"
                        : "bg-card/40 border-border/40 text-slate-300 hover:border-indigo-500/30"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={checkedTaskIds.includes(t.id)}
                        onChange={() => handleToggleTaskCheck(t.id)}
                        className="rounded border-border/60 bg-black/20 text-indigo-600 focus:ring-0 focus:ring-offset-0 h-4 w-4 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold block">{t.title}</span>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase block mt-1">{t.project_title}</span>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground border border-dashed border-border/30 rounded-xl">
                    <Workflow className="h-7 w-7 text-border mb-2" />
                    <p className="text-xs">No active sprint tickets assigned to you.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Self added checklists */}
          <div className="md:col-span-1 space-y-6">
            <Card className="glass border-border/40 flex flex-col h-full">
              <CardHeader>
                <CardTitle className="text-white text-md">3. Custom Tasks</CardTitle>
                <CardDescription className="text-xs">
                  Add non-sprint, administrative, or learning goals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">

                {/* Custom list builder */}
                <form onSubmit={handleAddCustomTodo} className="flex gap-2">
                  <Input
                    placeholder="Refactor tests, write docs..."
                    value={newCustomText}
                    onChange={(e) => setNewCustomText(e.target.value)}
                    className="h-8 text-xs bg-black/10 border-border/60"
                  />
                  <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>

                {/* Custom items display */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-55">
                  {customTodos.map((text, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-card/60 border border-border/40 text-xs text-white">
                      <span className="break-all pr-2">{text}</span>
                      <button
                        onClick={() => handleRemoveCustomTodo(idx)}
                        className="text-red-400 hover:text-red-300 font-bold px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {customTodos.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-8">No custom items added.</p>
                  )}
                </div>

                <Button
                  onClick={handleStartDay}
                  disabled={checkedTaskIds.length === 0 && customTodos.length === 0}
                  className="w-full h-10 font-bold bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 shadow-md mt-auto pt-2"
                >
                  <Play className="h-4 w-4" /> Start My Day
                </Button>

              </CardContent>
            </Card>
          </div>

        </div>

      ) : (

        // STARTED TODAY CHECKLIST PROGRESS VIEW
        <Card className="glass border-border/40">
          <CardHeader>
            <div className="flex justify-between items-center gap-4">
              <div>
                <CardTitle className="text-white text-md">Planned Checklist Progress</CardTitle>
                <CardDescription className="text-xs">
                  Cycle through statuses (Planned ➔ In Progress ➔ Done) to track today&apos;s execution.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-card/60 border border-border/40 px-2 py-0.5 rounded">
                <Clock className="h-3.5 w-3.5" /> Checked in today
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todos.map((todo) => {
              let statusText = "Planned";
              let statusColor = "text-slate-400 bg-slate-500/10 border-slate-500/20";
              let StatusIcon = Circle;

              if (todo.status === "in_progress") {
                statusText = "In Progress";
                statusColor = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
                StatusIcon = Clock;
              } else if (todo.status === "done") {
                statusText = "Completed";
                statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                StatusIcon = CheckCircle2;
              }

              return (
                <div
                  key={todo.id}
                  onClick={() => handleCycleStatus(todo.id, todo.status)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer hover:bg-card/25 transition-all duration-200 ${todo.status === "done"
                    ? "bg-emerald-500/5 border-emerald-500/20 text-slate-400 line-through"
                    : "bg-card/40 border-border/40 text-white"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-5 w-5 ${todo.status === "done" ? "text-emerald-400" : todo.status === "in_progress" ? "text-cyan-400" : "text-slate-400"}`} />
                    <span className="text-xs font-bold leading-relaxed">{todo.description}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border uppercase shrink-0 ${statusColor}`}>
                      {statusText}
                    </span>
                    {todo.task_id && (
                      <div onClick={(e) => e.stopPropagation()}>
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
