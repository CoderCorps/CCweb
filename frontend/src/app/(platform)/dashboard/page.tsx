"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/stores";
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
  Shield,
  ShieldCheck,
  Zap,
  ArrowRightLeft
} from "lucide-react";
import { StuckStudentsWidget } from "@/components/dashboard/stuck-students-widget";

import type { DashboardData } from "@/stores";


export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, fetchDashboard, invalidate } = useDashboardStore();

  // Review states (for mentors/admins)
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"approved" | "needs_revision">("approved");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // User role update states
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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
        invalidate(); // Invalidate cache
        fetchDashboard(); // Refetch fresh data
      } else {
        alert("Failed to submit review");
      }
    } catch (err) {
      alert("Failed to connect to server");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRoleChange = async (targetUserId: number, currentRole: string) => {
    let nextRole = "student";
    if (currentRole === "student") nextRole = "mentor";
    else if (currentRole === "mentor") nextRole = "admin";
    else if (currentRole === "admin") nextRole = "student";

    setUpdatingUserId(targetUserId);
    setUpdatingRole(true);

    try {
      const res = await api.patch(`/dashboard/users/${targetUserId}/role`, {
        role: nextRole
      });

      if (res.ok) {
        invalidate();
        fetchDashboard();
      } else {
        const errDetail = await res.json().catch(() => ({}));
        alert(errDetail.detail || "Failed to update role");
      }
    } catch (err) {
      alert("Error contacting api server");
    } finally {
      setUpdatingUserId(null);
      setUpdatingRole(false);
    }
  };

  if (loading && !data) {
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
        <Button onClick={() => { invalidate(); fetchDashboard(); }}>Retry Fetch</Button>
      </div>
    );
  }

  const role = data.role;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ------------------- KPI METRICS CARDS ------------------- */}
      {role === "admin" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Total Projects</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{data.stats.active_projects}</p>
            </div>
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <FolderGit2 className="h-5 w-5" />
            </div>
          </Card>
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Students Enrolled</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{data.stats.total_students}</p>
            </div>
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </Card>
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Platform Mentors</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{data.stats.total_mentors}</p>
            </div>
            <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </Card>
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Pending Submissions</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{data.stats.pending_reviews}</p>
            </div>
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl">
              <AlertCircle className="h-5 w-5" />
            </div>
          </Card>
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Total Audited Certs</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{data.stats.approved_certificates}</p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
          </Card>
        </div>
      )}

      {role === "mentor" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase">My Active Projects</p>
              <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.active_projects}</p>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <FolderGit2 className="h-6 w-6" />
            </div>
          </Card>
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Mentored Students</p>
              <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.total_students}</p>
            </div>
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
          </Card>
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Pending Audits</p>
              <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.pending_reviews}</p>
            </div>
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl">
              <AlertCircle className="h-6 w-6" />
            </div>
          </Card>
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Approved Certificates</p>
              <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.approved_certificates}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
          </Card>
        </div>
      )}

      {role === "student" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Joined Projects</p>
              <p className="text-3xl font-extrabold text-foreground mt-1">{data.stats.active_projects}</p>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <FolderGit2 className="h-6 w-6" />
            </div>
          </Card>
          <Card className="glass-premium border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Completed Tasks</p>
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
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
          </Card>
        </div>
      )}

      {/* ------------------- MAIN ROLES WIDGET LAYOUTS ------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ADMIN DASHBOARD PANELS */}
        {role === "admin" && (
          <>
            {/* User Roles Manager Control Center */}
            <Card className="lg:col-span-8 glass border-border/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-foreground">User Management Panel</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Promote or demote user access coordinates across the CoderCorps ecosystem.
                  </CardDescription>
                </div>
                <Zap className="h-5 w-5 text-violet-400" />
              </CardHeader>
              <CardContent>
                {data.users && data.users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border/40 font-mono text-[11px] text-muted-foreground uppercase">
                          <th className="pb-3 font-semibold">User Details</th>
                          <th className="pb-3 font-semibold">Email</th>
                          <th className="pb-3 font-semibold">System Role</th>
                          <th className="pb-3 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 font-sans">
                        {data.users.map((item) => (
                          <tr key={item.id} className="align-middle">
                            <td className="py-3.5 font-bold text-foreground">{item.name}</td>
                            <td className="py-3.5 text-xs text-muted-foreground font-mono">{item.email}</td>
                            <td className="py-3.5">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                                item.role === "admin" 
                                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                                  : item.role === "mentor"
                                    ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                                    : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                              }`}>
                                {item.role}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleRoleChange(item.id, item.role)}
                                disabled={updatingRole && updatingUserId === item.id}
                                className="text-xs font-semibold text-primary hover:bg-primary/10 gap-1.5"
                              >
                                <ArrowRightLeft className="h-3 w-3" />
                                {updatingRole && updatingUserId === item.id ? "Updating..." : "Cycle Role"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 font-mono">NO REGISTERED USERS FOUND.</p>
                )}
              </CardContent>
            </Card>

            {/* System-wide Activity Audits */}
            <Card className="lg:col-span-4 glass border-border/40">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Global Activity Log</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Recent developer submissions system-wide.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recent_submissions && data.recent_submissions.length > 0 ? (
                  <div className="space-y-4 font-sans text-xs">
                    {data.recent_submissions.map((sub) => (
                      <div key={sub.id} className="p-3 bg-card/30 border border-border/60 rounded-xl space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-foreground">{sub.project_title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">By: {sub.student_name}</p>
                          </div>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                            sub.status === "approved"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : sub.status === "needs_revision"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[10px] pt-1">
                          {sub.repo_url && (
                            <a href={sub.repo_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-0.5">
                              <ExternalLink className="h-2.5 w-2.5" /> Repo
                            </a>
                          )}
                          {sub.demo_url && (
                            <a href={sub.demo_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-0.5">
                              <ExternalLink className="h-2.5 w-2.5" /> Demo
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 font-mono">NO SUBMISSIONS SUBMITTED YET.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* MENTOR DASHBOARD PANELS */}
        {role === "mentor" && (
          <div className="lg:col-span-12 space-y-6">
            <StuckStudentsWidget />
            <Card className="glass border-border/40">
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
          </div>
        )}

        {/* STUDENT DASHBOARD PANELS */}
        {role === "student" && (
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
                        <div className="flex items-center gap-1">
                          <Link href={`/certify/${cert.id}`}>
                            <Button variant="ghost" size="icon" title="View public certificate" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15">
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          </Link>
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 font-mono">NO CERTIFICATES ISSUED YET.</p>
                )}
              </CardContent>
            </Card>

            {/* My Achievements / Badges */}
            <Card className="lg:col-span-12 glass border-border/40">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">My Achievements</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Badges earned for your consistency, bug smashing, and architectural mastery.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.badges && data.badges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {data.badges.map((badge) => (
                      <div key={badge.id} className="p-4 rounded-xl bg-card/40 border border-border/60 flex flex-col items-center text-center gap-2 hover:bg-card/60 transition-colors">
                        <img src={badge.image_url} alt={badge.name} className="w-16 h-16 drop-shadow-lg" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground leading-tight">{badge.name}</p>
                          <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 font-mono">NO BADGES EARNED YET. KEEP BUILDING!</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </div>
  );
}
