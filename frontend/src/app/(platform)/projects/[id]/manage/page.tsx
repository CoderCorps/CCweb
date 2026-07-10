"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Users, 
  Layers, 
  Plus, 
  Trash2, 
  UserPlus, 
  AlertCircle,
  CheckCircle2,
  Lock
} from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface ProjectMember {
  user_id: number;
  name: string;
  email: string;
  role: string;
  project_role: string;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  task_mode: string;
  difficulty: string | null;
  due_date: string | null;
  assignments: Array<{ user_id: number }>;
}

interface Sprint {
  id: number;
  sprint_number: number;
  goal: string | null;
  tasks: Task[];
}

interface Project {
  id: number;
  title: string;
  description: string;
  mentor_id: number;
}

export default function ProjectManagePage() {
  const { id } = useParams();
  const projectId = Number(id);
  const { user } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [assignableStudents, setAssignableStudents] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forms states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | "">("");

  // Create sprint state
  const [sprintNumber, setSprintNumber] = useState(1);
  const [sprintGoal, setSprintGoal] = useState("");
  const [sprintSubmitting, setSprintSubmitting] = useState(false);

  // Create task state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskMode, setTaskMode] = useState<"individual" | "competitive">("individual");
  const [taskDifficulty, setTaskDifficulty] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Task assignments selections: task_id -> list of user_ids
  const [assignmentsMap, setAssignmentsMap] = useState<Record<number, number[]>>({});

  const isMentor = user?.role === "mentor" || user?.role === "admin";

  async function fetchAllData() {
    try {
      // Get project details
      const projRes = await api.get(`/projects/${projectId}`);
      if (!projRes.ok) {
        setError("Project not found");
        setLoading(false);
        return;
      }
      const projData = await projRes.json();
      setProject(projData);

      // Guard check: redirect if student
      if (user && user.role !== "admin" && projData.mentor_id !== user.id) {
        router.push(`/projects/${projectId}`);
        return;
      }

      // Fetch members
      const memRes = await api.get(`/projects/${projectId}/members`);
      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(memData);
      }

      // Fetch assignable students
      const studRes = await api.get(`/projects/${projectId}/assignable-students`);
      if (studRes.ok) {
        const studData = await studRes.json();
        setAssignableStudents(studData);
      }

      // Fetch sprints
      const sprRes = await api.get(`/projects/${projectId}/sprints`);
      if (sprRes.ok) {
        const sprData = await sprRes.json();
        setSprints(sprData);
        if (sprData.length > 0) {
          const latest = sprData[sprData.length - 1];
          setActiveSprint(latest);
          setSprintNumber(sprData.length + 1);

          // Initialize task assignments map
          const initialMap: Record<number, number[]> = {};
          latest.tasks.forEach((t: Task) => {
            initialMap[t.id] = t.assignments.map(a => a.user_id);
          });
          setAssignmentsMap(initialMap);
        }
      }
    } catch (err) {
      setError("Failed to load project details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [projectId, user]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    try {
      const res = await api.post(`/projects/${projectId}/members`, {
        student_id: Number(selectedStudentId)
      });
      if (res.ok) {
        setSelectedStudentId("");
        fetchAllData();
      } else {
        alert("Failed to add member");
      }
    } catch (err) {
      alert("Error adding member");
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await api.delete(`/projects/${projectId}/members/${userId}`);
      if (res.ok) {
        fetchAllData();
      } else {
        alert("Failed to remove member");
      }
    } catch (err) {
      alert("Error removing member");
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSprintSubmitting(true);
    try {
      const res = await api.post(`/projects/${projectId}/sprints`, {
        sprint_number: sprintNumber,
        goal: sprintGoal,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
      if (res.ok) {
        setSprintGoal("");
        fetchAllData();
      } else {
        alert("Failed to create sprint");
      }
    } catch (err) {
      alert("Error creating sprint");
    } finally {
      setSprintSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSprint) return;
    setTaskSubmitting(true);

    try {
      const res = await api.post(`/projects/${projectId}/sprints/${activeSprint.id}/tasks`, {
        title: taskTitle,
        description: taskDesc || null,
        task_mode: taskMode,
        difficulty: taskDifficulty || null,
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        status: "todo"
      });

      if (res.ok) {
        setTaskTitle("");
        setTaskDesc("");
        setTaskDueDate("");
        fetchAllData();
      } else {
        alert("Failed to create task");
      }
    } catch (err) {
      alert("Error creating task");
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleToggleAssignment = (taskId: number, studentId: number) => {
    setAssignmentsMap(prev => {
      const current = prev[taskId] || [];
      const updated = current.includes(studentId)
        ? current.filter(id => id !== studentId)
        : [...current, studentId];
      return { ...prev, [taskId]: updated };
    });
  };

  const handleSaveAssignments = async (taskId: number, mode: string) => {
    const selectedUsers = assignmentsMap[taskId] || [];
    try {
      const res = await api.post(`/tasks/${taskId}/assign`, {
        user_ids: selectedUsers,
        mode: mode
      });
      if (res.ok) {
        alert("Task assignments updated successfully!");
        fetchAllData();
      } else {
        alert("Failed to save assignments");
      }
    } catch (err) {
      alert("Error saving assignments");
    }
  };

  const filteredAssignable = assignableStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-card rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <h3 className="text-lg font-bold text-white">Access Denied / Not Found</h3>
        <p className="text-sm text-muted-foreground">{error || "You do not have permission to manage this project."}</p>
        <Button onClick={() => router.push(`/projects/${projectId}`)}>Return to Project Board</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass px-6 py-4 rounded-xl border-border/40 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border border-border bg-card/60"
            onClick={() => router.push(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-400" />
              Manage: {project.title}
            </h1>
            <p className="text-xs text-muted-foreground">Admin/Mentor Control Panel</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Team Membership */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass border-border/40">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-md">
                <Users className="h-4 w-4 text-indigo-400" /> Team Members
              </CardTitle>
              <CardDescription className="text-[11px]">
                Add or remove student contributors from this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Add Member form */}
              <form onSubmit={handleAddMember} className="space-y-2.5">
                <div className="space-y-1">
                  <label htmlFor="search_students" className="text-[10px] font-bold text-slate-300 font-mono">SEARCH STUDENTS</label>
                  <Input
                    id="search_students"
                    placeholder="Search by name/email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs border-border/60 bg-black/20"
                  />
                </div>
                <div className="space-y-1">
                  <select
                    value={selectedStudentId}
                    required
                    onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : "")}
                    className="flex h-8 w-full rounded-md border border-input bg-card px-2 py-0.5 text-xs shadow-sm text-foreground"
                  >
                    <option value="" className="bg-card">Select student to add...</option>
                    {filteredAssignable.map((s) => (
                      <option key={s.id} value={s.id} className="bg-card">
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
                <Button 
                  type="submit" 
                  disabled={!selectedStudentId}
                  className="w-full h-8 text-xs font-semibold gap-1"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add Student
                </Button>
              </form>

              {/* Members List */}
              <div className="border-t border-border/40 pt-4 space-y-2.5 max-h-[250px] overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">CURRENT MEMBERS ({members.length})</span>
                {members.length > 0 ? (
                  members.map((m) => (
                    <div key={m.user_id} className="flex justify-between items-center p-2 rounded-lg bg-card/40 border border-border/30">
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{m.name}</p>
                        <p className="text-[9px] text-muted-foreground">{m.email}</p>
                      </div>
                      {m.project_role !== "lead" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleRemoveMember(m.user_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No student members assigned.</p>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Sprints & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Sprint controls */}
          <Card className="glass border-border/40">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-md">
                <Layers className="h-4 w-4 text-indigo-400" /> Sprint Management
              </CardTitle>
              <CardDescription className="text-[11px]">
                Create sprint iterations and set iteration goals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSprint ? (
                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 mb-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase">ACTIVE: SPRINT {activeSprint.sprint_number}</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">{activeSprint.goal || "No goals logged."}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono font-semibold">RUNNING</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-4">No active sprint running for this project board.</p>
              )}

              {/* Create Sprint form */}
              <form onSubmit={handleCreateSprint} className="flex gap-3 items-end">
                <div className="space-y-1 shrink-0 w-24">
                  <label htmlFor="sprint_num" className="text-[10px] font-bold text-slate-300 font-mono">SPRINT #</label>
                  <Input
                    id="sprint_num"
                    type="number"
                    required
                    value={sprintNumber}
                    onChange={(e) => setSprintNumber(Number(e.target.value))}
                    className="h-8 text-xs border-border/60 bg-black/20"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label htmlFor="sprint_goal" className="text-[10px] font-bold text-slate-300 font-mono">SPRINT GOAL</label>
                  <Input
                    id="sprint_goal"
                    required
                    value={sprintGoal}
                    onChange={(e) => setSprintGoal(e.target.value)}
                    placeholder="Implement modular routing layers..."
                    className="h-8 text-xs border-border/60 bg-black/20"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={sprintSubmitting}
                  className="h-8 text-xs font-semibold gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Start Sprint
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Task creation & assignment */}
          {activeSprint && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Task Creation Form */}
              <Card className="glass border-border/40">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Add Ticket to Sprint {activeSprint.sprint_number}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTask} className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="task_title" className="text-[10px] font-bold text-slate-300 font-mono">TICKET TITLE</label>
                      <Input
                        id="task_title"
                        required
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Write database schemas..."
                        className="h-8 text-xs border-border/60 bg-black/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="task_desc" className="text-[10px] font-bold text-slate-300 font-mono">DESCRIPTION</label>
                      <textarea
                        id="task_desc"
                        rows={2}
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                        placeholder="Define models mapping daily_todos..."
                        className="flex w-full rounded-md border border-input bg-black/20 px-3 py-2 text-xs shadow-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="task_mode" className="text-[10px] font-bold text-slate-300 font-mono">MODE</label>
                        <select
                          id="task_mode"
                          value={taskMode}
                          onChange={(e) => setTaskMode(e.target.value as any)}
                          className="flex h-8 w-full rounded-md border border-input bg-card px-2 py-0.5 text-xs shadow-sm"
                        >
                          <option value="individual" className="bg-card">Individual</option>
                          <option value="competitive" className="bg-card">Competitive</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="task_diff" className="text-[10px] font-bold text-slate-300 font-mono">DIFFICULTY</label>
                        <select
                          id="task_diff"
                          value={taskDifficulty}
                          onChange={(e) => setTaskDifficulty(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-input bg-card px-2 py-0.5 text-xs shadow-sm"
                        >
                          <option value="easy" className="bg-card">Easy</option>
                          <option value="medium" className="bg-card">Medium</option>
                          <option value="hard" className="bg-card">Hard</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="task_due" className="text-[10px] font-bold text-slate-300 font-mono">DUE DATE</label>
                      <Input
                        id="task_due"
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="h-8 text-xs border-border/60 bg-black/20"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={taskSubmitting}
                      className="w-full h-8 text-xs font-semibold gap-1 mt-2"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Task
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Task Assignments Manager */}
              <Card className="glass border-border/40 flex flex-col max-h-[480px]">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Assign Tickets</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4 min-h-0">
                  {activeSprint.tasks.length > 0 ? (
                    activeSprint.tasks.map((task) => (
                      <div key={task.id} className="p-3 bg-card/30 border border-border/30 rounded-xl space-y-2.5">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-bold text-white leading-tight">{task.title}</h5>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                              task.task_mode === "competitive" 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}>
                              {task.task_mode}
                            </span>
                          </div>
                          {task.due_date && (
                            <p className="text-[9px] text-muted-foreground font-mono mt-1">
                              DUE: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {/* Assignable Members checks */}
                        <div className="space-y-1.5 border-t border-border/20 pt-2">
                          <span className="text-[9px] font-bold text-slate-400 font-mono uppercase block">ASSIGN TO:</span>
                          <div className="space-y-1 max-h-[100px] overflow-y-auto">
                            {members.map((member) => {
                              const isChecked = (assignmentsMap[task.id] || []).includes(member.user_id);
                              return (
                                <label key={member.user_id} className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleAssignment(task.id, member.user_id)}
                                    className="rounded border-border/60 bg-black/20 text-indigo-600 focus:ring-0 focus:ring-offset-0 h-3 w-3"
                                  />
                                  <span>{member.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <Button
                          onClick={() => handleSaveAssignments(task.id, task.task_mode)}
                          className="w-full h-7 text-[10px] font-bold bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-white rounded transition-colors"
                        >
                          Save Assignments
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-12">No tasks created yet in this sprint cycle.</p>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
