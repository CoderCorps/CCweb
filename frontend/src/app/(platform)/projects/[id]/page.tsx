"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useProjectWorkspaceStore, type ProjectDetail, type Sprint, type Task } from "@/stores";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  GitBranch, 
  GitPullRequest, 
  Plus, 
  CheckCircle,
  ExternalLink,
  MessageSquare,
  FileText,
  AlertCircle,
  Users,
  Settings,
  UserPlus,
  Trophy,
  Terminal
} from "lucide-react";
import { toast } from "sonner";
import { ResourcesTab } from "@/components/projects/resources-tab";

export default function ProjectWorkspacePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const { 
    project, 
    sprints, 
    loading, 
    error, 
    fetchWorkspace, 
    invalidate, 
    updateTaskStatus 
  } = useProjectWorkspaceStore();
  
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);

  useEffect(() => {
    fetchWorkspace(Number(id));
  }, [id, fetchWorkspace]);

  // Sync active sprint when sprints load/update
  useEffect(() => {
    if (sprints.length > 0) {
      setActiveSprint((prev) => {
        if (prev) {
          const updated = sprints.find((s) => s.id === prev.id);
          return updated || sprints[sprints.length - 1];
        }
        return sprints[sprints.length - 1];
      });
    } else {
      setActiveSprint(null);
    }
  }, [sprints]);

  // New Sprint State (Mentor)
  const [sprintNumber, setSprintNumber] = useState(1);
  const [sprintGoal, setSprintGoal] = useState("");
  const [sprintSubmitting, setSprintSubmitting] = useState(false);
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);

  // New Task State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<number[]>([]);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // Task Details Modal (for editing status / linking PR)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskPr, setSelectedTaskPr] = useState("");
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<"todo" | "in_progress" | "review" | "done">("todo");
  const [selectedTaskAssigneeIds, setSelectedTaskAssigneeIds] = useState<number[]>([]);
  const [taskUpdating, setTaskUpdating] = useState(false);
  const [taskDetailDialogOpen, setTaskDetailDialogOpen] = useState(false);

  // Submit Project State (Student)
  const [demoUrl, setDemoUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Student Assignment States (Mentor/Admin)
  const [assignableStudents, setAssignableStudents] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | "">("");
  const [assigningStudent, setAssigningStudent] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);



  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSprintSubmitting(true);
    try {
      const res = await api.post(`/projects/${id}/sprints`, {
        sprint_number: sprintNumber,
        goal: sprintGoal,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks
      });

      if (res.ok) {
        setSprintDialogOpen(false);
        setSprintGoal("");
        setSprintNumber(prev => prev + 1);
        invalidate();
        fetchWorkspace(Number(id));
      } else {
        toast.error("Failed to create sprint.");
      }
    } catch (err) {
      toast.error("Error creating sprint.");
    } finally {
      setSprintSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSprint) return;
    setTaskSubmitting(true);

    try {
      const res = await api.post(`/projects/${id}/sprints/${activeSprint.id}/tasks`, {
        title: taskTitle,
        description: taskDesc,
        assignee_ids: taskAssigneeIds.length > 0 ? taskAssigneeIds : undefined,
        status: "todo"
      });

      if (res.ok) {
        setTaskDialogOpen(false);
        setTaskTitle("");
        setTaskDesc("");
        setTaskAssigneeIds([]);
        invalidate();
        fetchWorkspace(Number(id));
      } else {
        toast.error("Failed to create task.");
      }
    } catch (err) {
      toast.error("Error creating task.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  async function fetchAssignableStudents() {
    try {
      const res = await api.get(`/projects/${id}/assignable-students`);
      if (res.ok) {
        const json = await res.json();
        setAssignableStudents(json);
      }
    } catch (err) {
      console.error("Failed to load assignable students", err);
    }
  }

  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssigneeId) return;
    setAssigningStudent(true);
    try {
      const res = await api.post(`/projects/${id}/assign`, {
        student_id: Number(selectedAssigneeId)
      });
      if (res.ok) {
        setAssignDialogOpen(false);
        setSelectedAssigneeId("");
        invalidate();
        fetchWorkspace(Number(id));
      } else {
        const errorMsg = await res.json().catch(() => ({}));
        toast.error(errorMsg.detail || "Failed to assign student");
      }
    } catch (err) {
      toast.error("Error assigning student");
    } finally {
      setAssigningStudent(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setTaskUpdating(true);

    try {
      const res = await api.patch(`/projects/tasks/${selectedTask.id}`, {
        status: selectedTaskStatus,
        github_pr_url: selectedTaskPr || null,
        assignee_ids: selectedTaskAssigneeIds.length > 0 ? selectedTaskAssigneeIds : undefined
      });

      if (res.ok) {
        setTaskDetailDialogOpen(false);
        updateTaskStatus(selectedTask.id, selectedTaskStatus);
        invalidate();
        fetchWorkspace(Number(id));
      } else {
        toast.error("Failed to update task.");
      }
    } catch (err) {
      toast.error("Error updating task.");
    } finally {
      setTaskUpdating(false);
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProject(true);

    try {
      const res = await api.post(`/submissions`, {
        project_id: Number(id),
        demo_url: demoUrl,
        repo_url: repoUrl
      });

      if (res.ok) {
        setSubmitDialogOpen(false);
        setDemoUrl("");
        setRepoUrl("");
        toast.success("Deliverable successfully submitted to review queue!");
      } else {
        toast.error("Failed to submit project.");
      }
    } catch (err) {
      toast.error("Error submitting project.");
    } finally {
      setSubmittingProject(false);
    }
  };

  if (loading && !project) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-card rounded-xl" />
        <div className="grid grid-cols-4 gap-6">
          <div className="h-96 bg-card rounded-xl" />
          <div className="h-96 bg-card rounded-xl" />
          <div className="h-96 bg-card rounded-xl" />
          <div className="h-96 bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="glass p-6 text-center border-red-500/20 flex flex-col items-center gap-3">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <h3 className="text-lg font-bold text-white">Workspace Error</h3>
        <p className="text-sm text-muted-foreground">{error || "Could not resolve workspace details."}</p>
        <Button onClick={() => { invalidate(); fetchWorkspace(Number(id)); }}>Retry Load</Button>
      </div>
    );
  }

  const isMentor = user?.role === "mentor" || user?.role === "admin";
  const columns: Array<{ title: string; status: Task["status"]; border: string }> = [
    { title: "To Do", status: "todo", border: "border-slate-500/20" },
    { title: "In Progress", status: "in_progress", border: "border-cyan-500/20" },
    { title: "In Review", status: "review", border: "border-yellow-500/20" },
    { title: "Merged & Done", status: "done", border: "border-emerald-500/20" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Workspace Header */}
      <div className="glass p-6 rounded-2xl border-border/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/15 text-indigo-400 font-mono">ACTIVE BOARD</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-card text-muted-foreground border font-mono">MENTOR: {project.mentor?.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{project.title}</h1>
          <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">{project.description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Team Chat Room */}
          <Button 
            variant="outline" 
            className="font-semibold gap-1.5 border border-border bg-card/40 hover:bg-card/80 text-white"
            onClick={() => router.push(`/projects/${id}/room`)}
          >
            <MessageSquare className="h-4 w-4 text-indigo-400" /> Team Room
          </Button>

          {/* Leaderboard */}
          <Button 
            variant="outline" 
            className="font-semibold gap-1.5 border border-border bg-card/40 hover:bg-card/80 text-white"
            onClick={() => router.push(`/projects/${id}/leaderboard`)}
          >
            <Trophy className="h-4 w-4 text-yellow-400" /> Leaderboard
          </Button>

          {/* Pair Programming */}
          <Button 
            className="font-semibold gap-1.5 shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white"
            onClick={() => router.push(`/projects/${id}/pair`)}
          >
            <Terminal className="h-4 w-4" /> Live Pair Room
          </Button>

          {/* Manage Board (Mentor/Admin Only) */}
          {isMentor && (
            <Button 
              variant="outline" 
              className="font-semibold gap-1.5 border border-border bg-card/40 hover:bg-card/80 text-white"
              onClick={() => router.push(`/projects/${id}/manage`)}
            >
              <Settings className="h-4 w-4 text-indigo-400" /> Manage Board
            </Button>
          )}

          {/* Submit Project (Student Only) */}
          {!isMentor && (
            <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
              <DialogTrigger asChild>
                <Button className="font-semibold gap-1.5 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white">
                  <CheckCircle className="h-4 w-4" /> Submit Demo Day
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-premium border-border/60">
                <DialogHeader>
                  <DialogTitle className="text-white">Submit Deliverable for Audit</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Link your public repository and demo video to begin the mentor review audit.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitDeliverable} className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <label htmlFor="repo" className="text-xs font-semibold text-slate-300 font-mono">GITHUB REPOSITORY URL</label>
                    <Input 
                      id="repo" 
                      type="url" 
                      required
                      value={repoUrl} 
                      onChange={(e) => setRepoUrl(e.target.value)} 
                      placeholder="https://github.com/atulsharma-dev/distributed-api" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="demo" className="text-xs font-semibold text-slate-300 font-mono">DEMO VIDEO / DEPLOYED LINK</label>
                    <Input 
                      id="demo" 
                      type="url" 
                      value={demoUrl} 
                      onChange={(e) => setDemoUrl(e.target.value)} 
                      placeholder="https://youtu.be/..." 
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={submittingProject} className="w-full font-semibold">
                      {submittingProject ? "Submitting..." : "Submit Deliverables"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Assign Student Dialog (Mentor & Admin only) */}
          {isMentor && (
            <Dialog open={assignDialogOpen} onOpenChange={(open) => {
              setAssignDialogOpen(open);
              if (open) fetchAssignableStudents();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-semibold gap-1.5 border border-border">
                  <UserPlus className="h-4 w-4" /> Assign Student
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-premium border-border/60">
                <DialogHeader>
                  <DialogTitle className="text-white">Assign Student to Project</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Add a new student contributor to this active project workspace.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAssignStudent} className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <label htmlFor="student_select" className="text-xs font-semibold text-slate-300 font-mono">SELECT STUDENT</label>
                    <select
                      id="student_select"
                      required
                      value={selectedAssigneeId}
                      onChange={(e) => setSelectedAssigneeId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full h-9 rounded-md border border-input bg-card/60 px-3 text-sm shadow-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="" className="bg-card text-muted-foreground">Choose an unassigned student...</option>
                      {assignableStudents.map((student) => (
                        <option key={student.id} value={student.id} className="bg-card text-foreground">
                          {student.name} ({student.email})
                        </option>
                      ))}
                    </select>
                    {assignableStudents.length === 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        All active student accounts are already assigned to this project stream.
                      </p>
                    )}
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={assigningStudent || !selectedAssigneeId} className="w-full font-semibold">
                      {assigningStudent ? "Assigning..." : "Assign Student"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Create Sprint (Mentor Only) */}
          {isMentor && (
            <Dialog open={sprintDialogOpen} onOpenChange={setSprintDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-semibold gap-1.5 border border-border">
                  <Plus className="h-4 w-4" /> New Sprint
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-premium border-border/60">
                <DialogHeader>
                  <DialogTitle className="text-white">Start New Sprint Cycle</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Set goals for the next 2-week active iteration stream.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSprint} className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <label htmlFor="s_num" className="text-xs font-semibold text-slate-300 font-mono">SPRINT NUMBER</label>
                    <Input 
                      id="s_num" 
                      type="number" 
                      required
                      value={sprintNumber} 
                      onChange={(e) => setSprintNumber(Number(e.target.value))} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="s_goal" className="text-xs font-semibold text-slate-300 font-mono">GOAL</label>
                    <textarea
                      id="s_goal"
                      rows={3}
                      required
                      value={sprintGoal}
                      onChange={(e) => setSprintGoal(e.target.value)}
                      placeholder="Scaffold modular router layers and implement rate limiters..."
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={sprintSubmitting} className="w-full font-semibold">
                      {sprintSubmitting ? "Starting..." : "Start Sprint"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Create Task (Mentor Only) */}
          {activeSprint && isMentor && (
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button className="font-semibold gap-1.5">
                  <Plus className="h-4 w-4" /> Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-premium border-border/60">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Sprint Task</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Add a clear engineering ticket to the active sprint board.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <label htmlFor="t_title" className="text-xs font-semibold text-slate-300 font-mono">TASK TITLE</label>
                    <Input 
                      id="t_title" 
                      type="text" 
                      required
                      value={taskTitle} 
                      onChange={(e) => setTaskTitle(e.target.value)} 
                      placeholder="Implement rate-limiting middleware" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="t_desc" className="text-xs font-semibold text-slate-300 font-mono">DESCRIPTION</label>
                    <textarea
                      id="t_desc"
                      rows={3}
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      placeholder="Use token-bucket algorithm using Redis backend cache..."
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="t_assignee" className="text-xs font-semibold text-slate-300 font-mono">ASSIGN TO (MULTI-SELECT)</label>
                    <select
                      id="t_assignee"
                      multiple
                      value={taskAssigneeIds.map(String)}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value));
                        setTaskAssigneeIds(selectedOptions);
                      }}
                      className="w-full h-24 rounded-md border border-input bg-card/60 p-2 text-sm shadow-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {project.members.map((m) => (
                        <option key={m.user_id} value={m.user_id} className="bg-card mb-1">{m.user.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">Hold Ctrl/Cmd to select multiple members.</p>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={taskSubmitting} className="w-full font-semibold">
                      {taskSubmitting ? "Adding..." : "Add Ticket"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Sprints Switcher Header */}
      {sprints.length > 0 && activeSprint ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-card/30 p-3 rounded-lg border border-border/40 overflow-x-auto">
            <span className="text-xs font-semibold text-muted-foreground font-mono uppercase pl-2 flex-shrink-0">Sprint Log:</span>
            {sprints.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSprint(s)}
                className={`text-xs px-3 py-1 rounded-md font-mono transition-colors ${
                  activeSprint.id === s.id
                    ? "bg-primary text-white font-bold"
                    : "bg-border/60 hover:bg-border/80 text-muted-foreground hover:text-white"
                }`}
              >
                Sprint {s.sprint_number}
              </button>
            ))}
          </div>

          <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
            <h3 className="text-sm font-bold text-white font-mono uppercase">Sprint {activeSprint.sprint_number} Goal:</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeSprint.goal || "No specific goal logged."}</p>
          </div>

          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-sans">
            {columns.map((col) => {
              const colTasks = activeSprint.tasks.filter(t => t.status === col.status);
              return (
                <div key={col.status} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="font-bold text-sm text-slate-300">{col.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-border/40 text-muted-foreground">{colTasks.length}</span>
                  </div>

                  <div className="flex-grow flex flex-col gap-3 min-h-[300px]">
                    {colTasks.length > 0 ? (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setSelectedTask(task);
                            setSelectedTaskPr(task.github_pr_url || "");
                            setSelectedTaskStatus(task.status as "todo" | "in_progress" | "review" | "done");
                            setSelectedTaskAssigneeIds(task.assignments?.map((a: any) => a.user_id) || []);
                            setTaskDetailDialogOpen(true);
                          }}
                          className="glass p-4 rounded-xl border border-border/60 hover:border-primary/40 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <h4 className="font-bold text-sm text-white leading-tight">{task.title}</h4>
                          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                            {task.description || "No descriptions."}
                          </p>
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[150px]" title={task.assignments?.map((a: any) => a.user?.name).join(", ")}>
                              {task.assignments && task.assignments.length > 0 
                                ? task.assignments.map((a: any) => a.user?.name).join(", ") 
                                : "Unassigned"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {task.ci_status && (
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-mono ${task.ci_status === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                  CI: {task.ci_status.toUpperCase()}
                                </span>
                              )}
                              {task.test_coverage && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  COV: {task.test_coverage}%
                                </span>
                              )}
                              {task.github_pr_url && (
                                <GitPullRequest className="h-3.5 w-3.5 text-indigo-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-grow flex items-center justify-center border border-dashed border-border/30 rounded-xl py-12">
                        <span className="text-xs text-muted-foreground font-mono">Empty Column</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass p-12 text-center border-border/40 flex flex-col items-center gap-4">
          <GitBranch className="h-10 w-10 text-muted-foreground animate-pulse" />
          <div>
            <h3 className="font-bold text-white text-lg">No Active Sprint Iteration</h3>
            <p className="text-xs text-muted-foreground mt-1">
              There are no sprint cycles running for this workspace. A mentor must start a sprint cycle.
            </p>
          </div>
        </div>
      )}

      {/* Project Team Roster */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white font-mono uppercase">Project Roster</h2>
          <span className="text-xs text-muted-foreground font-mono bg-card px-2 py-1 rounded border border-border/60">
            {project.members.length} Members
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {project.members.map((member) => (
            <Card key={member.user_id} className="glass p-4 flex items-center justify-between gap-3 border-border/40 hover:border-indigo-500/30 transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0 overflow-hidden">
                  {member.user.avatar_url ? (
                    <img src={member.user.avatar_url} alt={member.user.name} className="h-full w-full object-cover" />
                  ) : (
                    member.user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">{member.user.name}</span>
                  <span className="text-[10px] text-indigo-400/80 font-mono uppercase truncate">{member.role}</span>
                </div>
              </div>
              {user?.id !== member.user_id && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 rounded-full hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 shrink-0"
                  onClick={() => router.push(`/messages?user=${member.user_id}`)}
                  title="Direct Message"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Project Resources */}
      <ResourcesTab projectId={Number(id)} />

      {/* Task Details Dialog (Linked to Card Click) */}
      <Dialog open={taskDetailDialogOpen} onOpenChange={setTaskDetailDialogOpen}>
        <DialogContent className="glass-premium border-border/60">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-card text-slate-400">ID: {selectedTask.id}</span>
                  {selectedTask.ci_status && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${selectedTask.ci_status === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      CI: {selectedTask.ci_status.toUpperCase()}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-white pt-2">{selectedTask.title}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-sans">
                  {selectedTask.description || "No description provided."}
                </DialogDescription>
              </DialogHeader>

              {/* Mocking AI Feedback retrieval since it's attached to TaskSubmission. For demo, we just show a static example if it's in 'review' status, or we could fetch it. */}
              {selectedTask.status === "review" && (
                 <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-sm">
                   <h4 className="text-indigo-400 font-bold mb-1 flex items-center gap-2">🤖 AI Pre-Review</h4>
                   <p className="text-indigo-300 text-xs">Awaiting mentor review. AI analysis triggered on linked PR.</p>
                 </div>
              )}

              <form onSubmit={handleUpdateTask} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 font-mono">STATUS</label>
                  <select
                    value={selectedTaskStatus}
                    onChange={(e) => setSelectedTaskStatus(e.target.value as "todo" | "in_progress" | "review" | "done")}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm shadow-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="todo" className="bg-card">To Do</option>
                    <option value="in_progress" className="bg-card">In Progress</option>
                    <option value="review" className="bg-card">In Review</option>
                    <option value="done" className="bg-card">Done (Merged)</option>
                  </select>
                </div>

                {isMentor && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 font-mono">EDIT ASSIGNMENTS (MULTI-SELECT)</label>
                    <select
                      multiple
                      value={selectedTaskAssigneeIds.map(String)}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value));
                        setSelectedTaskAssigneeIds(selectedOptions);
                      }}
                      className="w-full h-24 rounded-md border border-input bg-card/60 p-2 text-sm shadow-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {project?.members.map((m) => (
                        <option key={m.user_id} value={m.user_id} className="bg-card mb-1">{m.user.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">Hold Ctrl/Cmd to select multiple members.</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="t_pr" className="text-xs font-semibold text-slate-300 font-mono">LINK GITHUB PULL REQUEST</label>
                  <Input 
                    id="t_pr"
                    type="url"
                    value={selectedTaskPr}
                    onChange={(e) => setSelectedTaskPr(e.target.value)}
                    placeholder="https://github.com/codercorps/repo/pull/12"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={taskUpdating} className="w-full font-semibold">
                    {taskUpdating ? "Updating..." : "Update Ticket Info"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
