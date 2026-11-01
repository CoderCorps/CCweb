"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ExternalLink, 
  Star, 
  Code, 
  CheckCircle2, 
  GitPullRequest, 
  GitMerge, 
  Clock, 
  Sparkles, 
  FileCode, 
  Award, 
  ChevronDown, 
  ChevronUp,
  MessageSquare
} from "lucide-react";
import { CodeDiffViewer } from "./code-diff-viewer";
import { playSuccessChime, triggerConfetti } from "@/lib/celebrate";

interface PeerReviewItem {
  id: number;
  task_id: number;
  task_title?: string;
  project_title?: string;
  requester_id: number;
  reviewer_id: number;
  status: "pending" | "reviewed";
  review_note?: string | null;
  score?: number | null;
  created_at: string;
  reviewed_at?: string | null;
  github_pr_url?: string | null;
  code_diff?: string | null;
  filename?: string | null;
  requester?: {
    id: number;
    name: string;
    avatar_url?: string | null;
    college?: string | null;
  };
  reviewer?: {
    id: number;
    name: string;
    avatar_url?: string | null;
    college?: string | null;
  };
  submission?: {
    task_id: number;
    repo_url?: string;
    demo_url?: string;
    approach_notes?: string;
  };
}

export function PeerReviewPanel() {
  const [incomingReviews, setIncomingReviews] = useState<PeerReviewItem[]>([]);
  const [outgoingReviews, setOutgoingReviews] = useState<PeerReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  // State for inspecting diffs & submitting review
  const [expandedDiffId, setExpandedDiffId] = useState<number | null>(null);
  const [activeReviewId, setActiveReviewId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | "">(90);
  const [badgeNomination, setBadgeNomination] = useState<string>("Clean Code Champion");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      // Fetch incoming
      const resIn = await api.get("/peer-reviews/incoming");
      if (resIn.ok) {
        const dataIn = await resIn.json();
        setIncomingReviews(Array.isArray(dataIn) ? dataIn : []);
      } else {
        // Fallback to legacy route
        const resFallback = await api.get("/peer-reviews");
        if (resFallback.ok) {
          const data = await resFallback.json();
          setIncomingReviews(Array.isArray(data) ? data : []);
        }
      }

      // Fetch outgoing
      const resOut = await api.get("/peer-reviews/outgoing");
      if (resOut.ok) {
        const dataOut = await resOut.json();
        setOutgoingReviews(Array.isArray(dataOut) ? dataOut : []);
      }
    } catch (err) {
      console.error("Failed to fetch peer reviews", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent, reviewId: number) => {
    e.preventDefault();
    if (!feedback.trim() || score === "") return;

    setSubmitting(true);
    try {
      const res = await api.post(`/peer-reviews/${reviewId}/submit`, {
        feedback: feedback.trim(),
        score: Number(score),
        badge_nomination: badgeNomination,
      });

      if (res.ok) {
        // Play celebratory chime & confetti
        playSuccessChime();
        triggerConfetti();

        toast.success("Peer review submitted! +50 Karma Points awarded to your profile.");
        setFeedback("");
        setScore(90);
        setActiveReviewId(null);
        setExpandedDiffId(null);
        fetchReviews();
      } else {
        toast.error("Failed to submit peer review. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting review", err);
      toast.error("Error connecting to review server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass border-border/40 mt-6 p-6">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-slate-800" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-800 rounded w-1/3" />
            <div className="h-3 bg-slate-800 rounded w-1/2" />
          </div>
        </div>
      </Card>
    );
  }

  const pendingIncoming = incomingReviews.filter((r) => r.status === "pending");

  return (
    <Card className="glass border-border/40 mt-6 overflow-hidden shadow-2xl">
      <CardHeader className="pb-3 border-b border-border/30 bg-card/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-foreground text-base flex items-center gap-2 font-black">
              <GitPullRequest className="h-5 w-5 text-indigo-400" />
              <span>Peer Code Reviews &amp; PR Command Hub</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Review your teammates&apos; code diffs, provide actionable feedback, and earn karma points for verified code reviews.
            </CardDescription>
          </div>

          {/* Perspective Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 border border-border/60 p-1 rounded-xl text-xs font-mono self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("incoming")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "incoming"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Incoming for You</span>
              {pendingIncoming.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {pendingIncoming.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("outgoing")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "outgoing"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Your Outgoing PRs</span>
              <span className="text-[10px] text-muted-foreground">({outgoingReviews.length})</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Karma Reward Highlight Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-amber-500/10 border border-indigo-500/20 text-xs font-mono">
          <div className="flex items-center gap-2 text-indigo-300">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Earn +50 Karma Points per review &amp; accelerate Mentor Endorsement.</span>
          </div>
          <span className="hidden sm:inline text-amber-400 font-bold">100% Peer Verified</span>
        </div>

        {/* Tab 1: Incoming Reviews for Current User */}
        {activeTab === "incoming" && (
          <div className="space-y-4">
            {incomingReviews.length > 0 ? (
              incomingReviews.map((review) => {
                const isPending = review.status === "pending";
                const requesterName = review.requester?.name || "Peer Contributor";
                const taskTitle = review.task_title || `Task #${review.task_id}`;
                const projTitle = review.project_title || "Distributed Systems Project";
                const prUrl = review.github_pr_url || review.submission?.repo_url;
                const isDiffOpen = expandedDiffId === review.id;
                const isFormOpen = activeReviewId === review.id;

                const defaultDiff = review.code_diff || `--- a/src/services/webhook_handler.py\n+++ b/src/services/webhook_handler.py\n@@ -12,6 +12,18 @@ class WebhookDispatcher:\n-    def process(self, event):\n-        save_to_db(event)\n+    async def process(self, event, idempotency_key: str):\n+        # Verify idempotency key against processed events table\n+        if await self.cache.exists(idempotency_key):\n+            logger.info(f"Duplicate event {idempotency_key} skipped.")\n+            return {"status": "skipped_duplicate"}\n+\n+        async with self.db.transaction():\n+            record = await self.db.insert_event(event)\n+            await self.cache.set(idempotency_key, True, ttl=86400)\n+            return {"status": "success", "event_id": record.id}`;

                return (
                  <div 
                    key={review.id} 
                    className={`p-5 rounded-2xl border transition-all space-y-4 ${
                      isPending 
                        ? "bg-card/60 border-indigo-500/30 shadow-lg hover:border-indigo-500/50" 
                        : "bg-card/30 border-border/30 opacity-80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0 mt-0.5">
                          {requesterName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-foreground text-sm">{requesterName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {projTitle}
                            </span>
                            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                              isPending
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            }`}>
                              {isPending ? "Awaiting Your Review" : "Reviewed & Scored"}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-200 mt-1">{taskTitle}</h4>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            Requested: {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* External PR Link Button */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {prUrl && (
                          <a
                            href={prUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                          >
                            <Code className="h-3.5 w-3.5" />
                            <span>GitHub PR</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Approach notes if provided */}
                    {(review.submission?.approach_notes || review.review_note) && (
                      <div className="text-xs text-slate-300 bg-black/30 p-3 rounded-xl border border-border/30">
                        <strong className="text-slate-400 block font-mono text-[10px] uppercase mb-1">
                          {isPending ? "Developer Approach Notes" : "Your Reviewer Notes"}:
                        </strong>
                        <p className="italic leading-relaxed">
                          &ldquo;{isPending ? review.submission?.approach_notes || "Verified PR branch implementation." : review.review_note}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Toggle Inline Code Diff Viewer */}
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedDiffId(isDiffOpen ? null : review.id)}
                        className="text-xs font-mono gap-1.5 border-border bg-card/60"
                      >
                        <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{isDiffOpen ? "Hide Inline PR Diff" : "Inspect Inline PR Diff"}</span>
                        {isDiffOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>

                      {isDiffOpen && (
                        <div className="mt-3">
                          <CodeDiffViewer
                            filename={review.filename || "src/services/webhook_handler.py"}
                            diffText={defaultDiff}
                          />
                        </div>
                      )}
                    </div>

                    {/* Review Action Form (For Pending Reviews) */}
                    {isPending && (
                      <div>
                        {isFormOpen ? (
                          <form 
                            onSubmit={(e) => handleSubmitReview(e, review.id)} 
                            className="space-y-4 pt-4 border-t border-border/30 mt-4 bg-slate-900/60 p-4 rounded-xl border border-indigo-500/20"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-300 font-mono uppercase">
                                  Score &amp; Code Quality (0-100)
                                </label>
                                <Input 
                                  type="number"
                                  min="0"
                                  max="100"
                                  required
                                  value={score}
                                  onChange={(e) => setScore(e.target.value ? Number(e.target.value) : "")}
                                  className="h-9 text-sm font-mono font-bold bg-slate-950 border-border max-w-[120px]"
                                />
                              </div>

                              <div className="space-y-1 w-full sm:w-auto">
                                <label className="text-[10px] font-bold text-slate-300 font-mono uppercase">
                                  Nominate Peer Badge
                                </label>
                                <select
                                  value={badgeNomination}
                                  onChange={(e) => setBadgeNomination(e.target.value)}
                                  className="h-9 px-3 text-xs bg-slate-950 border border-border rounded-lg text-slate-200 font-mono w-full"
                                >
                                  <option value="Clean Code Champion">Clean Code Champion 🧼</option>
                                  <option value="Speed Demon">Speed Demon ⚡</option>
                                  <option value="Blocker Crusher">Blocker Crusher 🛡️</option>
                                  <option value="Test Master">Test Master 🧪</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-300 font-mono uppercase">
                                Constructive Peer Review Feedback
                              </label>
                              <textarea 
                                required 
                                rows={3}
                                value={feedback} 
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Give actionable feedback on structure, error handling, SQL idempotency, and test coverage..."
                                className="flex w-full rounded-xl border border-input bg-slate-950 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <Button 
                                type="submit" 
                                disabled={submitting} 
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{submitting ? "Approving..." : "Approve PR & Award Karma 🚀"}</span>
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setActiveReviewId(null)} 
                                className="text-xs border-border"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <Button 
                            onClick={() => setActiveReviewId(review.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Start Code Review (+50 Karma)</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-card/20 rounded-2xl border border-border/30">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-foreground">Inbox is Clear!</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  No incoming peer code reviews waiting for you right now. When teammates submit PRs in your sprints, they will appear here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Outgoing Reviews Submitted By Current User */}
        {activeTab === "outgoing" && (
          <div className="space-y-4">
            {outgoingReviews.length > 0 ? (
              outgoingReviews.map((review) => {
                const isReviewed = review.status === "reviewed";
                const reviewerName = review.reviewer?.name || "Assigned Peer Reviewer";
                const taskTitle = review.task_title || `Task #${review.task_id}`;
                const projTitle = review.project_title || "Distributed Systems Project";

                return (
                  <div 
                    key={review.id} 
                    className="p-5 rounded-2xl border border-border/40 bg-card/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            isReviewed
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}>
                            {isReviewed ? "Reviewed & Approved" : "Under Peer Review"}
                          </span>
                          <span className="text-xs font-mono text-indigo-400 font-bold">{projTitle}</span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground mt-1">{taskTitle}</h4>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Reviewer: {reviewerName} • Submitted: {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {review.score !== null && review.score !== undefined && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-mono">
                          <Award className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-300">Score: {review.score}/100</span>
                        </div>
                      )}
                    </div>

                    {review.review_note && (
                      <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-border/40 italic">
                        <span className="text-slate-400 font-mono text-[10px] uppercase block not-italic font-bold mb-0.5">
                          Peer Feedback:
                        </span>
                        &ldquo;{review.review_note}&rdquo;
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-card/20 rounded-2xl border border-border/30">
                <GitMerge className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
                <h4 className="text-sm font-bold text-foreground">No Outgoing Peer Reviews</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  When you submit code deliverables for your tasks, request a peer review from your team to get feedback before mentor submission.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
