"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ExternalLink, Star, Code, CheckCircle2 } from "lucide-react";

export function PeerReviewPanel() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for submitting a review
  const [activeReviewId, setActiveReviewId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await api.get("/peer-reviews");
      if (res.ok) {
        const data = await res.json();
        // Only show pending reviews
        setReviews(data.filter((r: any) => r.status === "pending"));
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
        score: Number(score)
      });
      if (res.ok) {
        toast.success("Peer review submitted successfully! You've earned karma.");
        setFeedback("");
        setScore("");
        setActiveReviewId(null);
        fetchReviews();
      } else {
        toast.error("Failed to submit peer review");
      }
    } catch (err) {
      console.error("Error submitting review", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-card rounded-xl"></div>;
  }

  if (reviews.length === 0) {
    return null; // Don't render anything if there are no pending reviews
  }

  return (
    <Card className="glass border-border/40 mt-6">
      <CardHeader className="pb-3 border-b border-border/20">
        <CardTitle className="text-white text-md flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-400" /> Pending Peer Reviews
        </CardTitle>
        <CardDescription className="text-xs">
          Review your peers' code submissions to help them improve and earn karma points.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="p-4 bg-card/40 border border-border/40 rounded-xl space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code className="h-4 w-4 text-indigo-400" /> Peer Submission
                </h5>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">TASK ID: {review.submission.task_id}</p>
              </div>
              <div className="flex gap-2">
                {review.submission.repo_url && (
                  <a href={review.submission.repo_url} target="_blank" rel="noreferrer" className="text-[10px] bg-black/30 hover:bg-black/50 border border-border/60 text-indigo-300 px-2 py-1 rounded inline-flex items-center gap-1 font-mono">
                    <ExternalLink className="h-3 w-3" /> Repository
                  </a>
                )}
                {review.submission.demo_url && (
                  <a href={review.submission.demo_url} target="_blank" rel="noreferrer" className="text-[10px] bg-black/30 hover:bg-black/50 border border-border/60 text-cyan-300 px-2 py-1 rounded inline-flex items-center gap-1 font-mono">
                    <ExternalLink className="h-3 w-3" /> Demo
                  </a>
                )}
              </div>
            </div>
            
            <div className="text-[11px] text-slate-300 bg-black/20 p-2.5 rounded-lg border border-border/20 whitespace-pre-wrap">
              <strong>Approach Notes:</strong><br />
              {review.submission.approach_notes || "No notes provided."}
            </div>

            {activeReviewId === review.id ? (
              <form onSubmit={(e) => handleSubmitReview(e, review.id)} className="space-y-3 pt-3 border-t border-border/20 mt-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 font-mono">SCORE (0-100)</label>
                  <Input 
                    type="number"
                    min="0" max="100" required
                    value={score} onChange={e => setScore(e.target.value ? Number(e.target.value) : "")}
                    className="h-8 text-xs bg-black/20 border-border/60 max-w-[100px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 font-mono">CONSTRUCTIVE FEEDBACK</label>
                  <textarea 
                    required rows={3}
                    value={feedback} onChange={e => setFeedback(e.target.value)}
                    placeholder="Provide actionable feedback on their code structure, logic, and style..."
                    className="flex w-full rounded-md border border-input bg-black/20 px-3 py-2 text-xs shadow-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setActiveReviewId(null)} className="h-8 text-xs">
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button 
                onClick={() => setActiveReviewId(review.id)}
                className="w-full h-8 text-xs font-semibold mt-2"
                variant="secondary"
              >
                Start Peer Review
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
