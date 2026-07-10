"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { 
  ClipboardList, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Terminal
} from "lucide-react";

interface Submission {
  id: number;
  project_title: string;
  student_name: string;
  submitted_at: string;
  repo_url: string;
  demo_url: string;
}

export default function ReviewsBoardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review Dialog State
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"approved" | "needs_revision">("approved");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Enforce mentor/admin role checks in frontend
  useEffect(() => {
    if (user && user.role !== "mentor" && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  async function fetchSubmissions() {
    try {
      const res = await api.get("/dashboard/summary");
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json.pending_submissions || []);
      } else {
        setError("Failed to fetch pending reviews");
      }
    } catch (err) {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubmissions();
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
        fetchSubmissions(); // Refresh
      } else {
        alert("Failed to submit review");
      }
    } catch (err) {
      alert("Error connecting to server");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-card rounded-xl" />
        <div className="h-60 bg-card rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews Board</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit student codebase contributions and approve certificate allocations.
          </p>
        </div>
      </div>

      {/* Submissions List */}
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Pending Code Audits</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Review live demo and repository code commits for validation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length > 0 ? (
            <div className="divide-y divide-border/40 font-sans">
              {submissions.map((sub) => (
                <div key={sub.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground text-base">{sub.project_title}</p>
                    <p className="text-xs text-muted-foreground">Submitted by: <span className="text-foreground">{sub.student_name}</span></p>
                    <div className="flex gap-4 text-xs font-mono pt-1">
                      {sub.repo_url && (
                        <a href={sub.repo_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3.5 w-3.5" /> Source Code PRs
                        </a>
                      )}
                      {sub.demo_url && (
                        <a href={sub.demo_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3.5 w-3.5" /> Deployed Demo
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Audit Trigger */}
                  <Dialog open={dialogOpen && reviewId === sub.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if(open) {
                      setReviewId(sub.id);
                      setFeedback("");
                      setReviewStatus("approved");
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="font-semibold">Audit Codebase</Button>
                    </DialogTrigger>
                    <DialogContent className="glass-premium border-border/60">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Audit Student Submission</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                          Validate codebase contributions and approve server-side certificate allocation.
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
                              Approve Audit
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
                          <label htmlFor="feedback_board" className="text-xs font-semibold text-foreground font-mono">FEEDBACK AUDIT</label>
                          <textarea
                            id="feedback_board"
                            rows={4}
                            required
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Specify audited items: PR #1 merged. Unit tests verified. Deployed live link approved..."
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                          />
                        </div>
                        <DialogFooter className="pt-2">
                          <Button type="submit" disabled={submittingReview} className="w-full font-semibold">
                            {submittingReview ? "Submitting..." : "Submit Review Audit"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <ClipboardList className="h-8 w-8 text-muted-foreground animate-pulse" />
              <p className="text-xs text-muted-foreground font-mono">NO ACTIVE CODE AUDITS IN QUEUE.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
