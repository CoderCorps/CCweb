"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Users, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Eye, 
  FileText, 
  Mail, 
  Phone, 
  GraduationCap, 
  Send,
  Award,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";

interface CandidateSummary {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  college: string | null;
  applied_at: string;
  invitation_status: "pending" | "in_progress" | "completed" | "expired";
  expires_at: string;
  total_score: number | null;
  reminders_count: number;
}

interface ReminderLogItem {
  id: number;
  reminder_number: number;
  sent_at: string;
  email_provider_message_id: string | null;
}

interface QuestionReviewItem {
  question_id: number;
  order_index: number;
  question_text: string;
  options: string[];
  selected_option_index: number | null;
  correct_option_index: number;
  is_correct: boolean;
  difficulty: string;
  explanation: string;
  time_limit_seconds: number;
  time_taken_seconds: number | null;
  was_timeout: boolean;
}

interface CandidateResultPayload {
  attempt_id: number;
  candidate_name: string;
  assessment_title: string;
  total_score: number;
  total_questions: number;
  correct_count: number;
  basic_correct_count: number;
  basic_total: number;
  intermediate_correct_count: number;
  intermediate_total: number;
  total_time_seconds: number;
  completed_at: string | null;
  questions: QuestionReviewItem[];
}

interface CandidateDetail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  college: string | null;
  why_join: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  resume_url?: string | null;
  instagram_url?: string | null;
  applied_at: string;
  source: string | null;
  invitation: {
    invitation_id: number;
    token_hash: string;
    status: string;
    created_at: string;
    expires_at: string;
    started_at: string | null;
    completed_at: string | null;
  } | null;
  reminder_logs: ReminderLogItem[];
  result: CandidateResultPayload | null;
}

export default function AdminCandidateDashboard() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Detail Modal State
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<CandidateDetail | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/admin/candidate-applications";
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      } else {
        toast.error("Failed to load candidate applications.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error fetching candidate applications.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleOpenDetail = async (id: number) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await api.get(`/admin/candidate-applications/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      } else {
        toast.error("Failed to load candidate application details.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error loading candidate details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResendInvitation = async (id: number) => {
    try {
      setResendingId(id);
      const res = await api.post(`/admin/candidate-applications/${id}/resend-invitation`, {});
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Fresh invitation sent!");
        fetchCandidates();
        if (detailOpen && detailData?.id === id) {
          handleOpenDetail(id);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Failed to resend invitation.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error resending invitation.");
    } finally {
      setResendingId(null);
    }
  };

  const totalApplied = candidates.length;
  const completedCount = candidates.filter((c) => c.invitation_status === "completed").length;
  const completionRate = totalApplied > 0 ? Math.round((completedCount / totalApplied) * 100) : 0;
  
  const completedScores = candidates.filter((c) => c.total_score !== null).map((c) => c.total_score as number);
  const avgScore = completedScores.length > 0 ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length) : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass p-6 sm:p-8 rounded-2xl border border-border/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" /> Admissions & Screening Audit
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Candidate Applications & Test Links
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            Monitor public candidate applications, invitation statuses, automated reminder sweeps, and candidate scores.
          </p>
        </div>
      </div>

      {/* Quick Summary Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass border-border/60 p-4 space-y-1">
          <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground">Total Applicants</span>
          <div className="text-2xl font-black text-foreground font-mono">{totalApplied}</div>
          <p className="text-[10px] text-muted-foreground">Registered via public website apply portal</p>
        </Card>

        <Card className="glass border-border/60 p-4 space-y-1">
          <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground">Completion Rate</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{completionRate}%</div>
          <p className="text-[10px] text-muted-foreground">{completedCount} of {totalApplied} completed assessment</p>
        </Card>

        <Card className="glass border-border/60 p-4 space-y-1">
          <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground">Average Candidate Score</span>
          <div className="text-2xl font-black text-emerald-500 font-mono">{avgScore}%</div>
          <p className="text-[10px] text-muted-foreground">Based on completed 10-question Python tests</p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass p-4 rounded-xl border border-border/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Status:
          </span>
          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-input">
            {["all", "pending", "in_progress", "completed", "expired"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-all ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search candidate or college..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/50 border-input rounded-xl"
          />
        </div>
      </div>

      {/* Candidate Applications Table */}
      {loading ? (
        <LoadingSpinner text="Fetching Candidate Applications..." />
      ) : candidates.length === 0 ? (
        <Card className="p-8 text-center glass border-border/40 space-y-2">
          <Users className="h-8 w-8 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-bold text-foreground">No Applications Found</h4>
          <p className="text-xs text-muted-foreground">
            No public candidate applications match the selected status or search filter.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((cand) => {
            const st = cand.invitation_status;
            let badge = (
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono uppercase">
                Pending
              </span>
            );

            if (st === "in_progress") {
              badge = (
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono uppercase animate-pulse">
                  In Progress
                </span>
              );
            } else if (st === "completed") {
              badge = (
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono uppercase">
                  Completed
                </span>
              );
            } else if (st === "expired") {
              badge = (
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-mono uppercase">
                  Expired
                </span>
              );
            }

            return (
              <div
                key={cand.id}
                className="glass p-4 rounded-xl border border-border/60 hover:border-primary/40 transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{cand.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">({cand.email})</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                    {cand.college && <span>College: {cand.college}</span>}
                    <span>Applied: {new Date(cand.applied_at).toLocaleDateString()}</span>
                    {cand.reminders_count > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                        Reminders Sent: {cand.reminders_count}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  {cand.total_score !== null ? (
                    <div className="text-right">
                      <span className="text-lg font-black font-mono text-emerald-500">
                        {cand.total_score}%
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono block uppercase">Score</span>
                    </div>
                  ) : (
                    badge
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDetail(cand.id)}
                      className="h-9 font-bold text-xs gap-1.5 border-border rounded-xl"
                    >
                      <Eye className="h-3.5 w-3.5 text-primary" /> View Detail
                    </Button>

                    {(st === "pending" || st === "expired") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={resendingId === cand.id}
                        onClick={() => handleResendInvitation(cand.id)}
                        className="h-9 text-xs font-bold gap-1 rounded-xl"
                        title="Resend 1-Time Assessment Link"
                      >
                        <Send className="h-3 w-3" /> Resend Link
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="glass border-border/60 max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailLoading || !detailData ? (
            <LoadingSpinner text="Fetching Candidate Audit Detail..." />
          ) : (
            <div className="space-y-6 py-2">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                      Candidate Application Detail
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {detailData.name} • {detailData.email}
                    </DialogDescription>
                  </div>
                  {detailData.result && (
                    <span className="text-2xl font-black font-mono text-primary">
                      {detailData.result.total_score}%
                    </span>
                  )}
                </div>
              </DialogHeader>

              {/* Applicant Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-background/50 border border-border/40 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Phone</span>
                  <span className="font-bold text-foreground">{detailData.phone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">College</span>
                  <span className="font-bold text-foreground">{detailData.college || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Applied Date</span>
                  <span className="font-bold text-foreground">{new Date(detailData.applied_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Source</span>
                  <span className="font-bold text-foreground uppercase">{detailData.source || "website"}</span>
                </div>
              </div>

              {/* Social & Resume Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {detailData.linkedin_url && (
                  <a
                    href={detailData.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-between hover:bg-blue-500/20 transition-all"
                  >
                    <span>LinkedIn Profile</span>
                    <span className="text-[10px] uppercase font-mono">Open ↗</span>
                  </a>
                )}

                {detailData.github_url && (
                  <a
                    href={detailData.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-background/80 border border-border text-foreground font-bold flex items-center justify-between hover:bg-muted transition-all"
                  >
                    <span>GitHub Profile</span>
                    <span className="text-[10px] uppercase font-mono">Open ↗</span>
                  </a>
                )}

                {detailData.resume_url && (
                  <a
                    href={detailData.resume_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between hover:bg-emerald-500/20 transition-all"
                  >
                    <span>Resume / Portfolio</span>
                    <span className="text-[10px] uppercase font-mono">View Drive ↗</span>
                  </a>
                )}

                {detailData.instagram_url && (
                  <a
                    href={detailData.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 font-bold flex items-center justify-between hover:bg-pink-500/20 transition-all"
                  >
                    <span>Instagram Profile</span>
                    <span className="text-[10px] uppercase font-mono">Open ↗</span>
                  </a>
                )}
              </div>

              {detailData.why_join && (
                <div className="p-3.5 bg-card/60 rounded-xl border border-border/40 text-xs text-muted-foreground">
                  <span className="font-bold text-foreground block font-mono text-[10px] uppercase mb-1">
                    Candidate "Why Join" Statement:
                  </span>
                  {detailData.why_join}
                </div>
              )}

              {/* Invitation & Reminder Timeline */}
              {detailData.invitation && (
                <div className="p-4 rounded-xl bg-background/50 border border-border/40 space-y-2 text-xs font-mono">
                  <h4 className="font-bold text-foreground uppercase text-[11px]">
                    Invitation Timeline & Reminders
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                    <div>Status: <strong className="text-foreground uppercase">{detailData.invitation.status}</strong></div>
                    <div>Issued: {new Date(detailData.invitation.created_at).toLocaleTimeString()}</div>
                    <div>Expires: {new Date(detailData.invitation.expires_at).toLocaleTimeString()}</div>
                    <div>Reminders Sent: <strong className="text-indigo-600 dark:text-indigo-400">{detailData.reminder_logs.length}</strong></div>
                  </div>

                  {detailData.reminder_logs.length > 0 && (
                    <div className="pt-2 border-t border-border/30 space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Reminder Sweep Audit Log:</span>
                      {detailData.reminder_logs.map((log) => (
                        <div key={log.id} className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span>Reminder #{log.reminder_number} sent at {new Date(log.sent_at).toLocaleString()}</span>
                          {log.email_provider_message_id && (
                            <span className="text-muted-foreground/60">(Msg ID: {log.email_provider_message_id})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Question Review if Completed */}
              {detailData.result && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                    Candidate Test Breakdown ({detailData.result.questions.length} Questions)
                  </h4>

                  {detailData.result.questions.map((q) => (
                    <div
                      key={q.question_id}
                      className={`p-4 rounded-xl border space-y-3 ${
                        q.is_correct ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-card text-foreground border">
                              Q{q.order_index} ({q.difficulty})
                            </span>
                            {q.is_correct ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono uppercase">
                                <Check className="h-3 w-3" /> Correct
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 flex items-center gap-1 font-mono uppercase">
                                <X className="h-3 w-3" /> Incorrect
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm text-foreground">{q.question_text}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, idx) => {
                          const isAnswerKey = idx === q.correct_option_index;
                          const isCandidatePick = idx === q.selected_option_index;

                          let optionStyle = "bg-background/40 border-border/40 text-muted-foreground";
                          if (isAnswerKey) {
                            optionStyle = "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold";
                          } else if (isCandidatePick && !q.is_correct) {
                            optionStyle = "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300 font-bold line-through";
                          }

                          return (
                            <div key={idx} className={`p-2.5 rounded-lg border flex items-center justify-between ${optionStyle}`}>
                              <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                              {isAnswerKey && <span className="text-[9px] font-mono uppercase text-emerald-600 dark:text-emerald-400">[Correct Answer]</span>}
                              {isCandidatePick && !isAnswerKey && <span className="text-[9px] font-mono uppercase text-red-500">[Candidate Pick]</span>}
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-card/60 rounded-lg border border-border/40 text-xs text-muted-foreground leading-relaxed">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block font-mono text-[10px] uppercase mb-0.5">
                          LLM Explanation & Logic:
                        </span>
                        {q.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
