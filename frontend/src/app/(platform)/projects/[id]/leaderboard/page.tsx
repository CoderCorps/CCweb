"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Trophy, 
  ArrowLeft, 
  Award, 
  Code, 
  ExternalLink, 
  CheckCircle2, 
  Star, 
  AlertCircle,
  FileText,
  Bookmark,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { TaskComments } from "@/components/tasks/task-comments";
import { StuckFlagButton } from "@/components/tasks/stuck-flag-button";

interface LeaderboardEntry {
  user_id: number;
  name: string;
  avatar_url: string | null;
  total_score: number;
  tasks_completed: number;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  task_mode: "individual" | "competitive";
  difficulty: string | null;
  due_date: string | null;
}

interface Sprint {
  id: number;
  sprint_number: number;
  goal: string | null;
  tasks: Task[];
}

interface Submission {
  id: number;
  task_id: number;
  user_id: number;
  user_name: string;
  repo_url: string | null;
  demo_url: string | null;
  approach_notes: string | null;
  submitted_at: string;
  mentor_score: number | null;
  mentor_feedback: string | null;
  reviewed_at: string | null;
  ai_score?: number | null;
  ai_feedback_json?: any;
}

export default function LeaderboardPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const { user } = useAuth();
  const router = useRouter();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  
  // Selected Task to view/submit
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Submission Form State (Student)
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [approachNotes, setApproachNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mySubmissionsDialogOpen, setMySubmissionsDialogOpen] = useState(false);

  // Review Form State (Mentor)
  const [mentorScores, setMentorScores] = useState<Record<number, number>>({});
  const [mentorFeedbacks, setMentorFeedbacks] = useState<Record<number, string>>({});
  const [savingReviewId, setSavingReviewId] = useState<number | null>(null);
  const [mentorHistoryDialogOpen, setMentorHistoryDialogOpen] = useState(false);
  const [mentorHistoryUserId, setMentorHistoryUserId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMentor = user?.role === "mentor" || user?.role === "admin";

  const fetchTaskSubmissions = useCallback(async (taskId: number) => {
    try {
      const res = await api.get(`/tasks/${taskId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);

        // Prepopulate review form inputs for mentors
        const scores: Record<number, number> = {};
        const feedbacks: Record<number, string> = {};
        data.forEach((s: Submission) => {
          scores[s.id] = s.mentor_score || 0;
          feedbacks[s.id] = s.mentor_feedback || "";
        });
        setMentorScores(scores);
        setMentorFeedbacks(feedbacks);
      }
    } catch (err) {
      console.error("Failed to load task submissions", err);
    }
  }, []);

  const fetchLeaderboardAndTasks = useCallback(async () => {
    try {
      // 1. Fetch leaderboard
      const leadRes = await api.get(`/projects/${projectId}/leaderboard`);
      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLeaderboard(leadData);
      }

      // 2. Fetch sprints & active tasks
      const sprRes = await api.get(`/projects/${projectId}/sprints`);
      if (sprRes.ok) {
        const sprData = await sprRes.json();
        setSprints(sprData);
        if (sprData.length > 0) {
          const latest = sprData[sprData.length - 1];
          setActiveSprint(latest);
          if (latest.tasks.length > 0) {
            setSelectedTask(latest.tasks[0]);
            fetchTaskSubmissions(latest.tasks[0].id);
          }
        }
      }
    } catch (err) {
      setError("Failed to load project metrics");
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchTaskSubmissions]);

  useEffect(() => {
    fetchLeaderboardAndTasks();
  }, [fetchLeaderboardAndTasks]);

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setRepoUrl("");
    setDemoUrl("");
    setApproachNotes("");
    fetchTaskSubmissions(task.id);
  };

  // Student submits code
  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);

    try {
      const res = await api.post(`/tasks/${selectedTask.id}/submissions`, {
        repo_url: repoUrl.trim() || null,
        demo_url: demoUrl.trim() || null,
        approach_notes: approachNotes.trim() || null
      });

      if (res.ok) {
        toast.success("Submission saved successfully!");
        setRepoUrl("");
        setDemoUrl("");
        setApproachNotes("");
        fetchTaskSubmissions(selectedTask.id);
        fetchLeaderboardAndTasks();
      } else {
        toast.error("Failed to submit code");
      }
    } catch (err) {
      toast.error("Error saving submission");
    } finally {
      setSubmitting(false);
    }
  };

  // Mentor submits grade review
  const handleSaveReview = async (submissionId: number, needsImprovement: boolean = false) => {
    const score = mentorScores[submissionId] || 0;
    const feedback = mentorFeedbacks[submissionId] || "";
    setSavingReviewId(submissionId);

    try {
      const res = await api.patch(`/task-submissions/${submissionId}/review`, {
        mentor_score: needsImprovement ? null : Number(score),
        mentor_feedback: feedback.trim(),
        needs_improvement: needsImprovement
      });
      if (res.ok) {
        toast.success(needsImprovement ? "Requested changes successfully!" : "Grade and feedback updated successfully!");
        if (selectedTask) fetchTaskSubmissions(selectedTask.id);
        fetchLeaderboardAndTasks();
      } else {
        toast.error("Failed to update grading review");
      }
    } catch (err) {
      toast.error("Error saving review");
    } finally {
      setSavingReviewId(null);
    }
  };

  // Trigger AI Pre-Review
  const [triggeringAi, setTriggeringAi] = useState<number | null>(null);
  const handleTriggerAiReview = async (submissionId: number) => {
    setTriggeringAi(submissionId);
    try {
      const res = await api.post(`/task-submissions/${submissionId}/ai-review`, {});
      if (res.ok) {
        toast.success("AI Pre-Review completed!");
        if (selectedTask) fetchTaskSubmissions(selectedTask.id);
        fetchLeaderboardAndTasks();
      } else {
        toast.error("Failed to run AI Pre-Review");
      }
    } catch (err) {
      toast.error("Error triggering AI Pre-Review");
    } finally {
      setTriggeringAi(null);
    }
  };

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

  if (error) {
    return (
      <div className="glass p-6 text-center border-red-500/20 flex flex-col items-center gap-3">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <h3 className="text-lg font-bold text-white">Leaderboard Error</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => router.push(`/projects/${projectId}`)}>Return to Project Workspace</Button>
      </div>
    );
  }

  const studentSubmissions = submissions.filter(s => s.user_id === user?.id).sort((a,b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
  const latestSubmission = studentSubmissions[studentSubmissions.length - 1];
  const isRejected = latestSubmission && latestSubmission.mentor_score === null && latestSubmission.mentor_feedback;

  const mentorGroupedSubmissions = (() => {
    const map = new Map<number, Submission[]>();
    submissions.forEach(sub => {
      if (!map.has(sub.user_id)) map.set(sub.user_id, []);
      map.get(sub.user_id)!.push(sub);
    });
    return Array.from(map.values()).map(userSubs => {
      userSubs.sort((a,b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
      return {
        latest: userSubs[userSubs.length - 1],
        all: userSubs
      };
    });
  })();

  const selectedStudentSubmissionsForMentor = mentorGroupedSubmissions.find(g => g.latest.user_id === mentorHistoryUserId)?.all || [];

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
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-indigo-400" />
              Leaderboard & Submissions
            </h1>
            <p className="text-xs text-muted-foreground">Compete, share approach notes, and view scores.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Ranked Leaderboard */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass border-border/40">
            <CardHeader>
              <CardTitle className="text-white text-md flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-400" /> Standings
              </CardTitle>
              <CardDescription className="text-xs">
                Ranked student scores computed from graded task reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {leaderboard.length > 0 ? (
                leaderboard.map((student, idx) => {
                  const isRank1 = idx === 0;
                  return (
                    <div 
                      key={student.user_id} 
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isRank1 
                          ? "bg-yellow-500/5 border-yellow-500/30 text-white shadow-md shadow-yellow-500/5" 
                          : "bg-card/40 border-border/20 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-mono font-bold w-5 text-center ${isRank1 ? "text-yellow-400 text-sm" : "text-slate-400"}`}>
                          #{idx + 1}
                        </span>
                        
                        {/* Avatar */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden ${
                          isRank1 ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300" : "bg-indigo-600/20 border border-indigo-500/20 text-indigo-300"
                        }`}>
                          {student.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>

                        <div>
                          <span className={`text-xs font-bold block ${isRank1 ? "text-yellow-300" : ""}`}>{student.name}</span>
                          <span className="text-[9px] text-muted-foreground">{student.tasks_completed} tasks completed</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm font-extrabold font-mono ${isRank1 ? "text-yellow-400" : "text-white"}`}>
                          {student.total_score} pts
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-12">No leaderboard standing data available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Tasks & Submissions */}
        <div className="lg:col-span-2 space-y-6">
          {activeSprint ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Tasks List */}
              <div className="md:col-span-1 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">SPRINT {activeSprint.sprint_number} TICKETS</span>
                <div className="space-y-2.5">
                  {activeSprint.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        selectedTask?.id === task.id
                          ? "bg-indigo-600/10 border-indigo-500/60 text-white"
                          : "bg-card/40 border-border/20 text-slate-300 hover:border-indigo-500/30"
                      }`}
                    >
                      <h5 className="text-xs font-bold leading-tight">{task.title}</h5>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[8px] font-bold font-mono px-1 py-0.5 rounded uppercase border ${
                          task.task_mode === "competitive" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {task.task_mode}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono uppercase">{task.difficulty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submission / Review Deck */}
              <div className="md:col-span-2 space-y-6">
                {selectedTask && (
                  <Card className="glass border-border/40">
                    <CardHeader className="pb-3 border-b border-border/20">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <CardTitle className="text-white text-sm">{selectedTask.title}</CardTitle>
                          <CardDescription className="text-[11px] mt-1 font-sans">
                            {selectedTask.description || "No description logged for this task."}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono uppercase shrink-0 ${
                            selectedTask.task_mode === "competitive" 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}>
                            {selectedTask.task_mode}
                          </span>
                          {!isMentor && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-6 text-[10px] font-mono border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                                onClick={() => setMySubmissionsDialogOpen(true)}
                              >
                                My Submissions
                              </Button>
                              <StuckFlagButton taskId={selectedTask.id} />
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-xs font-sans">
                      
                      {/* USER ROLE IS STUDENT: Submitting & Comparative learning */}
                      {!isMentor && (
                        <div className="space-y-4">
                          
                          {/* Rejected Banner */}
                          {isRejected && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <div>
                                  <h4 className="text-red-400 font-bold text-sm">Rejected Submission</h4>
                                  <p className="text-red-300/80 text-[11px] mt-0.5">Your mentor has requested changes. Please resubmit your work.</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {(!latestSubmission || isRejected) ? (
                            <form onSubmit={handleSubmitCode} className="space-y-3.5 bg-card/20 p-4 rounded-xl border border-border/20">
                              <span className="text-[10px] font-bold text-slate-300 font-mono flex items-center gap-1">
                                <Code className="h-3.5 w-3.5 text-indigo-400" /> SUBMIT YOUR ATTEMPT
                              </span>

                              <div className="space-y-1">
                                <label htmlFor="repo_u" className="text-[9px] font-bold text-slate-400 font-mono">GITHUB REPOSITORY URL</label>
                                <Input
                                  id="repo_u"
                                  type="url"
                                  required
                                  value={repoUrl}
                                  onChange={(e) => setRepoUrl(e.target.value)}
                                  placeholder="https://github.com/..."
                                  className="h-8 text-xs bg-black/20 border-border/60"
                                />
                              </div>

                              <div className="space-y-1">
                                <label htmlFor="demo_u" className="text-[9px] font-bold text-slate-400 font-mono">DEMO VIDEO / DEPLOYED LINK (OPTIONAL)</label>
                                <Input
                                  id="demo_u"
                                  type="url"
                                  value={demoUrl}
                                  onChange={(e) => setDemoUrl(e.target.value)}
                                  placeholder="https://youtu.be/..."
                                  className="h-8 text-xs bg-black/20 border-border/60"
                                />
                              </div>

                              <div className="space-y-1">
                                <label htmlFor="a_notes" className="text-[9px] font-bold text-slate-400 font-mono">APPROACH NOTES & ARCHITECTURAL LOGIC</label>
                                <textarea
                                  id="a_notes"
                                  rows={4}
                                  value={approachNotes}
                                  onChange={(e) => setApproachNotes(e.target.value)}
                                  placeholder="Explain your algorithmic trade-offs or design decisions..."
                                  className="flex w-full rounded-md border border-border/60 bg-black/20 px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <Button type="submit" disabled={submitting} className="w-full h-9 font-bold bg-indigo-600 hover:bg-indigo-700">
                                {submitting ? "Transmitting..." : "Transmit Submission"}
                              </Button>
                            </form>
                          ) : (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-4">
                              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                              <div className="space-y-2 w-full">
                                <h4 className="text-emerald-400 font-bold text-sm">Submission Locked</h4>
                                {latestSubmission?.mentor_score === null ? (
                                  <p className="text-emerald-300/80 text-xs">Your attempt has been successfully transmitted and is awaiting review.</p>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                                      <span className="text-[10px] font-bold text-emerald-400 font-mono flex items-center gap-1">
                                        <Award className="h-4 w-4" /> ATTEMPT GRADED
                                      </span>
                                      <span className="text-md font-extrabold font-mono text-emerald-400">{latestSubmission?.mentor_score}/100</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300">
                                      <strong>Feedback:</strong> {latestSubmission?.mentor_feedback || "Excellent work!"}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* COMPETE & SEE THE BEST WAY TO SOLVE IT (If Reviewed & Competitive task) */}
                          {selectedTask.task_mode === "competitive" && latestSubmission?.mentor_score !== null && !isRejected && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 mt-2">
                              <strong>Competitive Task:</strong> Other students' attempts will appear below once they are graded.
                            </div>
                          )}
                          {selectedTask.task_mode === "competitive" && latestSubmission?.mentor_score !== null && (
                            <div className="space-y-3.5 border-t border-border/20 pt-4">
                              <span className="text-[10px] font-bold text-amber-400 font-mono flex items-center gap-1">
                                <Star className="h-4 w-4 shrink-0" /> PEER COMPARATIVE DECK
                              </span>
                              <div className="space-y-3">
                                {submissions.length > 0 ? (
                                  submissions.map((sub) => {
                                    const isPeer = sub.user_id !== user?.id;
                                    return (
                                      <div key={sub.id} className="p-3 bg-card/40 border border-border/20 rounded-xl space-y-2.5">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-bold text-white">{sub.user_name} {isPeer ? "(Peer)" : "(You)"}</span>
                                          {sub.repo_url && (
                                            <a 
                                              href={sub.repo_url} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="text-[10px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-0.5 font-mono"
                                            >
                                              <ExternalLink className="h-3 w-3" /> Repo
                                            </a>
                                          )}
                                        </div>
                                        <div className="p-2.5 bg-black/20 rounded-lg border border-border/20 text-[11px] text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                                          {sub.approach_notes || "No approach notes provided."}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-[11px] text-muted-foreground text-center py-4">No peer attempts available.</p>
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      {/* USER ROLE IS MENTOR: Grade attempts */}
                      {isMentor && (
                        <div className="space-y-4">
                          <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">STUDENT ATTEMPTS ({mentorGroupedSubmissions.length})</span>
                          {mentorGroupedSubmissions.length > 0 ? (
                            mentorGroupedSubmissions.map(({ latest: sub, all: userSubs }) => (
                              <div key={sub.id} className="p-4 bg-card/25 border border-border/20 rounded-xl space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h6 className="text-xs font-bold text-white">{sub.user_name}</h6>
                                      {userSubs.length > 1 && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-5 px-1.5 text-[9px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 font-mono border border-indigo-500/20"
                                          onClick={() => {
                                            setMentorHistoryUserId(sub.user_id);
                                            setMentorHistoryDialogOpen(true);
                                          }}
                                        >
                                          History ({userSubs.length})
                                        </Button>
                                      )}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-mono mt-0.5">LATEST SUBMISSION: {new Date(sub.submitted_at).toLocaleDateString()}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    {sub.repo_url && (
                                      <a 
                                        href={sub.repo_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="h-6 text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 hover:bg-black/60 border border-border/40 inline-flex items-center gap-0.5 text-slate-300"
                                      >
                                        <ExternalLink className="h-3 w-3" /> Repository
                                      </a>
                                    )}
                                    {sub.demo_url && (
                                      <a 
                                        href={sub.demo_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="h-6 text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 hover:bg-black/60 border border-border/40 inline-flex items-center gap-0.5 text-slate-300"
                                      >
                                        <ExternalLink className="h-3 w-3" /> Deployed Demo
                                      </a>
                                    )}
                                  </div>
                                </div>

                                <div className="p-3 bg-black/20 rounded-xl border border-border/20 text-[11px] text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                                  <strong>Approach Notes:</strong><br />
                                  {sub.approach_notes || "No approach notes written."}
                                </div>

                                {/* AI Pre-Review Section */}
                                <div className="p-3 bg-indigo-950/30 rounded-xl border border-indigo-500/20 text-[11px] text-slate-200">
                                  <div className="flex justify-between items-center mb-2">
                                    <strong className="text-indigo-400 font-mono">🤖 AI PRE-REVIEW</strong>
                                    {sub.ai_score !== null && sub.ai_score !== undefined ? (
                                      <span className="font-mono text-indigo-300 bg-indigo-900/50 px-2 py-0.5 rounded border border-indigo-500/30">
                                        Score: {sub.ai_score}/100
                                      </span>
                                    ) : (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-6 text-[9px] font-mono"
                                        onClick={() => handleTriggerAiReview(sub.id)}
                                        disabled={triggeringAi === sub.id}
                                      >
                                        {triggeringAi === sub.id ? "Analyzing..." : "Trigger AI Review"}
                                      </Button>
                                    )}
                                  </div>
                                  {sub.ai_feedback_json && (
                                    <div className="space-y-1.5 opacity-90">
                                      <p><strong>Syntax:</strong> {sub.ai_feedback_json.syntax_score}/100</p>
                                      <p><strong>Best Practices:</strong> {sub.ai_feedback_json.best_practices}</p>
                                      <p><strong>Security:</strong> {sub.ai_feedback_json.security}</p>
                                      <p><strong>Summary:</strong> {sub.ai_feedback_json.overall_summary}</p>
                                    </div>
                                  )}
                                  {!sub.ai_feedback_json && sub.ai_score == null && (
                                    <p className="opacity-60 text-[10px] italic">No AI review performed yet.</p>
                                  )}
                                </div>

                                {/* Grade controls */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end border-t border-border/10 pt-3">
                                  <div className="space-y-1">
                                    <label htmlFor={`score_${sub.id}`} className="text-[9px] font-bold text-slate-400 font-mono">SCORE (0-100)</label>
                                    <Input
                                      id={`score_${sub.id}`}
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={mentorScores[sub.id] || ""}
                                      onChange={(e) => setMentorScores(prev => ({ ...prev, [sub.id]: Number(e.target.value) }))}
                                      className="h-8 text-xs bg-black/10 border-border/60"
                                    />
                                  </div>
                                  <div className="space-y-1 md:col-span-2">
                                    <label htmlFor={`feed_${sub.id}`} className="text-[9px] font-bold text-slate-400 font-mono font-bold">FEEDBACK NOTES</label>
                                    <Input
                                      id={`feed_${sub.id}`}
                                      value={mentorFeedbacks[sub.id] || ""}
                                      onChange={(e) => setMentorFeedbacks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                      placeholder="Leave review comments..."
                                      className="h-8 text-xs bg-black/10 border-border/60"
                                    />
                                  </div>
                                  <div className="flex gap-2 w-full">
                                    <Button
                                      onClick={() => handleSaveReview(sub.id, true)}
                                      disabled={savingReviewId === sub.id}
                                      variant="outline"
                                      className="h-8 text-xs font-bold w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                                    >
                                      {savingReviewId === sub.id ? "Saving..." : "Request Changes"}
                                    </Button>
                                    <Button
                                      onClick={() => handleSaveReview(sub.id, false)}
                                      disabled={savingReviewId === sub.id}
                                      className="h-8 text-xs font-bold w-full"
                                    >
                                      {savingReviewId === sub.id ? "Saving..." : "Save Grade"}
                                    </Button>
                                  </div>
                                </div>

                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-6">No submissions recorded yet for this task.</p>
                          )}
                        </div>
                      )}

                      {/* Comments Thread */}
                      <TaskComments taskId={selectedTask.id} />
                    </CardContent>
                  </Card>
                )}
              </div>

            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-12">No active sprints/tasks running for this project board.</p>
          )}
        </div>

      </div>

      {/* My Submissions Dialog */}
      <Dialog open={mySubmissionsDialogOpen} onOpenChange={setMySubmissionsDialogOpen}>
        <DialogContent className="glass-premium border-border/60 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">My Submissions</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Feedback history for {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>

          {studentSubmissions.length > 0 ? (
            <div className="space-y-4 py-2 max-h-[500px] overflow-y-auto pr-2">
              {studentSubmissions.map((sub, idx) => (
                <div key={sub.id} className="bg-black/20 border border-border/30 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center mb-2 border-b border-border/10 pb-3">
                    <span className="text-sm font-bold text-white">Submission Attempt {idx + 1}</span>
                    <span className="text-[10px] text-muted-foreground font-mono bg-card px-2 py-1 rounded-md border border-border/50">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 bg-black/30 p-3 rounded-lg border border-border/10">
                    <strong className="text-slate-400 block mb-1">Approach Notes:</strong>
                    {sub.approach_notes || "None provided"}
                  </div>

                  {/* AI Pre-Review */}
                  {sub.ai_feedback_json ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-sm">
                      <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">🤖 AI Pre-Review (Score: {sub.ai_score})</h4>
                      <div className="space-y-1.5 text-xs text-indigo-300/80">
                        <p><span className="text-indigo-300 font-bold">Best Practices:</span> {sub.ai_feedback_json.best_practices}</p>
                        <p><span className="text-indigo-300 font-bold">Security:</span> {sub.ai_feedback_json.security}</p>
                        <p><span className="text-indigo-300 font-bold">Summary:</span> {sub.ai_feedback_json.overall_summary}</p>
                      </div>
                    </div>
                  ) : (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-sm">
                        <h4 className="text-indigo-400 font-bold mb-1 flex items-center gap-2">🤖 AI Pre-Review</h4>
                        <p className="text-indigo-300 text-xs">Awaiting mentor review. AI analysis not yet triggered.</p>
                      </div>
                  )}

                  {/* Mentor Feedback */}
                  {sub.mentor_feedback && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm">
                        <h4 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">👨‍🏫 Mentor Feedback {sub.mentor_score !== null && `(Score: ${sub.mentor_score})`}</h4>
                        <p className="text-emerald-300 text-xs">{sub.mentor_feedback}</p>
                    </div>
                  )}
                  {sub.mentor_feedback && sub.mentor_score === null && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
                      <p className="text-red-400 font-bold text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> 
                        Mentor requested changes on this attempt.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center">
              <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-slate-300 font-bold">No Submissions Yet</p>
              <p className="text-xs text-muted-foreground mt-1">Submit your work to see feedback here.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Mentor History Dialog */}
      <Dialog open={mentorHistoryDialogOpen} onOpenChange={setMentorHistoryDialogOpen}>
        <DialogContent className="glass-premium border-border/60 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Submission History</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Feedback history for {selectedStudentSubmissionsForMentor[0]?.user_name} on {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedStudentSubmissionsForMentor.length > 0 && (
            <div className="space-y-4 py-2 max-h-[500px] overflow-y-auto pr-2">
              {selectedStudentSubmissionsForMentor.map((sub, idx) => (
                <div key={sub.id} className="bg-black/20 border border-border/30 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center mb-2 border-b border-border/10 pb-3">
                    <span className="text-sm font-bold text-white">Submission Attempt {idx + 1}</span>
                    <span className="text-[10px] text-muted-foreground font-mono bg-card px-2 py-1 rounded-md border border-border/50">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {sub.repo_url && (
                      <a href={sub.repo_url} target="_blank" rel="noopener noreferrer" className="h-6 text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 hover:bg-black/60 border border-border/40 inline-flex items-center gap-0.5 text-slate-300">
                        <ExternalLink className="h-3 w-3" /> Repository
                      </a>
                    )}
                    {sub.demo_url && (
                      <a href={sub.demo_url} target="_blank" rel="noopener noreferrer" className="h-6 text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 hover:bg-black/60 border border-border/40 inline-flex items-center gap-0.5 text-slate-300">
                        <ExternalLink className="h-3 w-3" /> Deployed Demo
                      </a>
                    )}
                  </div>

                  <div className="text-xs text-slate-300 bg-black/30 p-3 rounded-lg border border-border/10">
                    <strong className="text-slate-400 block mb-1">Approach Notes:</strong>
                    {sub.approach_notes || "None provided"}
                  </div>

                  {/* AI Pre-Review */}
                  {sub.ai_feedback_json && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-sm">
                      <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">🤖 AI Pre-Review (Score: {sub.ai_score})</h4>
                      <div className="space-y-1.5 text-xs text-indigo-300/80">
                        <p><span className="text-indigo-300 font-bold">Best Practices:</span> {sub.ai_feedback_json.best_practices}</p>
                        <p><span className="text-indigo-300 font-bold">Security:</span> {sub.ai_feedback_json.security}</p>
                        <p><span className="text-indigo-300 font-bold">Summary:</span> {sub.ai_feedback_json.overall_summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Mentor Feedback */}
                  {sub.mentor_feedback && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm">
                        <h4 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">👨‍🏫 Mentor Feedback {sub.mentor_score !== null && `(Score: ${sub.mentor_score})`}</h4>
                        <p className="text-emerald-300 text-xs">{sub.mentor_feedback}</p>
                    </div>
                  )}
                  {sub.mentor_feedback && sub.mentor_score === null && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
                      <p className="text-red-400 font-bold text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> 
                        You requested changes on this attempt.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
