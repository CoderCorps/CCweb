"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  FolderGit2, 
  CheckSquare, 
  Award, 
  Users, 
  AlertCircle, 
  Download, 
  CheckCircle,
  ExternalLink,
  MessageSquare,
  FileText
} from "lucide-react";

interface SummaryData {
  role: string;
  stats: {
    active_projects: number;
    tasks_completed?: number;
    tasks_total?: number;
    certificates_earned?: number;
    total_students?: number;
    pending_reviews?: number;
    approved_certificates?: number;
  };
  active_tasks?: Array<{
    id: number;
    title: string;
    status: string;
    project_title: string;
    sprint_number: number;
  }>;
  certificates?: Array<{
    id: number;
    project_title: string;
    issued_at: string;
    criteria: any;
  }>;
  pending_submissions?: Array<{
    id: number;
    project_title: string;
    student_name: string;
    submitted_at: string;
    repo_url: string;
    demo_url: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review states (for mentors)
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"approved" | "needs_revision">("approved");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function fetchSummary() {
    try {
      const res = await api.get("/dashboard/summary");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Failed to fetch dashboard summary");
      }
    } catch (err) {
      setError("Failed to connect to API server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewId === null) return;
    setSubmittingReview(true);

    try {
      const res = await api.patch(`/submissions/${reviewId}/review`, {
        feedback,
        status: reviewStatus
      });

      if (res.ok) {
        setDialogOpen(false);
        setFeedback("");
        fetchSummary(); // Refresh data
      } else {
        alert("Failed to submit review");
      }
    } catch (err) {
      alert("Failed to connect to server");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        <div className="h-32 bg-card rounded-xl" />
        <div className="h-32 bg-card rounded-xl" />
        <div className="h-32 bg-card rounded-xl" />
        <div className="h-96 bg-card col-span-3 rounded-xl mt-6" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass p-6 border-red-500/20 text-center flex flex-col items-center gap-3">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <h3 className="text-lg font-bold text-foreground">Error Loading Dashboard</h3>
        <p className="text-sm text-muted-foreground">{error || "Something went wrong."}</p>
        <Button onClick={() => { setLoading(true); fetchSummary(); }}>Retry Fetch</Button>
      </div>
    );
  }

  const isMentor = data.role === "mentor" || data.role === "admin";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase">Active Projects</p>
            <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.active_projects}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <FolderGit2 className="h-6 w-6" />
          </div>
        </Card>

        {isMentor ? (
          <>
            <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Total Students</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.total_students}</p>
              </div>
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </Card>

            <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Pending Reviews</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.pending_reviews}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </Card>

            <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Approved Audits</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.approved_certificates}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <Award className="h-6 w-6" />
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Tasks Completed</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">
                  {data.stats.tasks_completed} <span className="text-sm font-normal text-muted-foreground">/ {data.stats.tasks_total}</span>
                </p>
              </div>
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                <CheckSquare className="h-6 w-6" />
              </div>
            </Card>

            <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase">Certificates Earned</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.certificates_earned}</p>
              </div>
              <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
                <Award className="h-6 w-6" />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Main Action Tables / Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {isMentor ? (
          /* MENTOR VIEW: Pending Submissions review board */
          <Card className="lg:col-span-12 glass border-border/40">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Pending Submissions Review Board</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Audit student demo deliverables and issue verifiable project completion logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.pending_submissions && data.pending_submissions.length > 0 ? (
                <div className="divide-y divide-border/40 font-sans">
                  {data.pending_submissions.map((sub) => (
                    <div key={sub.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">{sub.project_title}</p>
                        <p className="text-xs text-muted-foreground">Submitted by: <span className="text-foreground">{sub.student_name}</span></p>
                        <div className="flex gap-4 text-xs font-mono pt-1">
                          {sub.repo_url && (
                            <a href={sub.repo_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> Code Repo
                            </a>
                          )}
                          {sub.demo_url && (
                            <a href={sub.demo_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> Live Demo
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {/* Trigger Review Dialog */}
                      <Dialog open={dialogOpen && reviewId === sub.id} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if(open) {
                          setReviewId(sub.id);
                          setFeedback("");
                          setReviewStatus("approved");
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="font-semibold">Audit Submission</Button>
                        </DialogTrigger>
                        <DialogContent className="glass-premium border-border/60">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">Audit Student Submission</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                              Approve code contribution and automatically generate verifiable credentials.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleReviewSubmit} className="space-y-4 py-2">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-foreground font-mono">STATUS</label>
                              <div className="grid grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={() => setReviewStatus("approved")}
                                  className={`p-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                                    reviewStatus === "approved"
                                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                      : "border-border/60 text-muted-foreground hover:bg-border/20"
                                  }`}
                                >
                                  Approve & Issue Certificate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewStatus("needs_revision")}
                                  className={`p-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                                    reviewStatus === "needs_revision"
                                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                                      : "border-border/60 text-muted-foreground hover:bg-border/20"
                                  }`}
                                >
                                  Request Revisions
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label htmlFor="feedback" className="text-xs font-semibold text-foreground font-mono">FEEDBACK & CODE COMMITS AUDIT</label>
                              <textarea
                                id="feedback"
                                rows={4}
                                required
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Audit logs: PR #4 merged. Clean modular architecture. Database indexing implemented on users tables..."
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                            </div>
                            <DialogFooter className="pt-2">
                              <Button type="submit" disabled={submittingReview} className="w-full font-semibold">
                                {submittingReview ? "Submitting Audit..." : "Submit Review Audit"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6 font-mono">NO PENDING SUBMISSIONS REGISTERED.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          /* STUDENT VIEW: Assigned Tasks & Certificates */
          <>
            {/* Active Tasks */}
            <Card className="lg:col-span-7 glass border-border/40">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Active Tasks</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Your pending sprint checklist. Access the Kanban board to update statuses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.active_tasks && data.active_tasks.length > 0 ? (
                  <div className="space-y-3 font-sans">
                    {data.active_tasks.map((task) => (
                      <div key={task.id} className="p-4 rounded-lg bg-card/40 border border-border/60 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground leading-tight">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.project_title} • Sprint {task.sprint_number}
                          </p>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          task.status === "in_progress" 
                            ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        }`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 font-mono">NO ACTIVE TASKS ASSIGNED.</p>
                )}
              </CardContent>
            </Card>

            {/* Certificates */}
            <Card className="lg:col-span-5 glass border-border/40">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Verifiable Certificates</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Credentials backed by public GitHub contributions and mentor reviews.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.certificates && data.certificates.length > 0 ? (
                  <div className="space-y-3 font-sans">
                    {data.certificates.map((cert) => (
                      <div key={cert.id} className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-foreground leading-none">{cert.project_title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Approved by: {cert.criteria?.mentor_name || "Staff Mentor"}
                          </p>
                        </div>
                        {/* Download JSON Mock */}
                        <Button variant="ghost" size="icon" onClick={() => {
                          const blob = new Blob([JSON.stringify(cert.criteria, null, 2)], {type : 'application/json'});
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `codercorps-certificate-${cert.id}.json`;
                          a.click();
                        }} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 font-mono">NO CERTIFICATES ISSUED YET.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
