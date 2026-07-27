"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Award, 
  Plus, 
  Users, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  ShieldAlert, 
  Eye, 
  FileText, 
  Search,
  Filter,
  Check,
  X,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";

interface AssessmentConfig {
  id: number;
  title: string;
  topic: string;
  basic_question_count: number;
  intermediate_question_count: number;
  basic_time_seconds: number;
  intermediate_time_seconds: number;
  created_at: string;
  is_active: boolean;
}

interface CandidateUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  college?: string | null;
  why_join?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  resume_url?: string | null;
  instagram_url?: string | null;
  applied_at?: string | null;
  is_public_candidate?: boolean;
  invitation_token?: string | null;
}

interface AttemptSummary {
  id: number;
  assessment_id: number;
  candidate: CandidateUser;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_score: number | null;
  tab_switch_count: number;
}

interface QuestionReviewItem {
  question_id: number;
  order_index: number;
  question_text: string;
  options: string[];
  correct_option_index: number;
  selected_option_index: number | null;
  is_correct: boolean;
  difficulty: string;
  explanation: string;
  time_limit_seconds: number;
  time_taken_seconds: number | null;
  was_timeout: boolean;
}

interface TabSwitchLog {
  id: number;
  attempt_id: number;
  question_order_index: number | null;
  switched_at: string;
}

interface DetailedAttemptReview {
  attempt_id: number;
  assessment_title: string;
  candidate: CandidateUser;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_score: number | null;
  tab_switch_count: number;
  tab_switch_logs?: TabSwitchLog[];
  questions: QuestionReviewItem[];
}

export default function MentorAssessmentsDashboard() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentConfig[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("python");
  const [basicCount, setBasicCount] = useState(5);
  const [interCount, setInterCount] = useState(5);
  const [basicTime, setBasicTime] = useState(45);
  const [interTime, setInterTime] = useState(90);
  const [creating, setCreating] = useState(false);

  // Detailed Review Modal State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewData, setReviewData] = useState<DetailedAttemptReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/assessments/");
      if (res.ok) {
        const data = await res.json();
        setAssessments(data);
        if (data.length > 0 && !selectedAssessmentId) {
          setSelectedAssessmentId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = useCallback(async (assId: number) => {
    try {
      setAttemptsLoading(true);
      const res = await api.get(`/assessments/${assId}/attempts`);
      if (res.ok) {
        const data = await res.json();
        setAttempts(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch candidate attempts.");
    } finally {
      setAttemptsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAssessmentId) {
      fetchAttempts(selectedAssessmentId);
    }
  }, [selectedAssessmentId, fetchAttempts]);

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await api.post("/assessments/", {
        title,
        topic,
        basic_question_count: Number(basicCount),
        intermediate_question_count: Number(interCount),
        basic_time_seconds: Number(basicTime),
        intermediate_time_seconds: Number(interTime),
        is_active: true
      });

      if (res.ok) {
        toast.success("Assessment configuration created!");
        setCreateOpen(false);
        setTitle("");
        fetchAssessments();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Failed to create assessment.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error creating assessment.");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenReview = async (attemptId: number) => {
    try {
      setReviewOpen(true);
      setReviewLoading(true);
      const res = await api.get(`/assessments/assessment-attempts/${attemptId}/review`);
      if (res.ok) {
        const data = await res.json();
        setReviewData(data);
      } else {
        toast.error("Could not load candidate attempt review.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error loading review.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleResetAttempt = async (attemptId: number) => {
    if (!confirm("Are you sure you want to reset this attempt? The candidate will be able to retake the test.")) {
      return;
    }

    try {
      const res = await api.post(`/assessments/assessment-attempts/${attemptId}/reset`, {});
      if (res.ok) {
        toast.success("Candidate attempt reset successfully.");
        if (selectedAssessmentId) fetchAttempts(selectedAssessmentId);
        setReviewOpen(false);
      } else {
        toast.error("Failed to reset attempt.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error resetting candidate attempt.");
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading Assessment Dashboard..." />;
  }

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);
  const filteredAttempts = attempts.filter((att) => 
    att.candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    att.candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (att.candidate.college && att.candidate.college.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass p-6 sm:p-8 rounded-2xl border border-border/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            <Award className="h-3.5 w-3.5" /> Screening Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Assessment & Candidate Audit Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            Configure LLM test parameters, monitor live attempt status, and review candidate performance breakdowns for internship decisions.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
              <Plus className="h-4 w-4" /> Create Assessment Config
            </Button>
          </DialogTrigger>

          <DialogContent className="glass border-border/60 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">New Screening Assessment</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set question counts and per-question strict timer limits.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateAssessment} className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Assessment Title</label>
                <Input
                  required
                  placeholder="e.g. Python Backend Screening v2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background/50 border-input rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Topic</label>
                <Input
                  required
                  placeholder="python"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="bg-background/50 border-input rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase font-mono">Basic Q Count</label>
                  <Input
                    type="number"
                    min={1}
                    max={15}
                    value={basicCount}
                    onChange={(e) => setBasicCount(Number(e.target.value))}
                    className="bg-background/50 border-input rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase font-mono">Basic Time (sec)</label>
                  <Input
                    type="number"
                    min={15}
                    max={300}
                    value={basicTime}
                    onChange={(e) => setBasicTime(Number(e.target.value))}
                    className="bg-background/50 border-input rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase font-mono">Inter. Q Count</label>
                  <Input
                    type="number"
                    min={1}
                    max={15}
                    value={interCount}
                    onChange={(e) => setInterCount(Number(e.target.value))}
                    className="bg-background/50 border-input rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase font-mono">Inter. Time (sec)</label>
                  <Input
                    type="number"
                    min={15}
                    max={300}
                    value={interTime}
                    onChange={(e) => setInterTime(Number(e.target.value))}
                    className="bg-background/50 border-input rounded-xl"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="submit" disabled={creating} className="w-full font-bold rounded-xl">
                  {creating ? "Creating..." : "Save Assessment Config"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Assessment Sidebar Selector */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider px-1">
            Active Tests ({assessments.length})
          </h3>
          <div className="space-y-2">
            {assessments.map((a) => {
              const isSelected = a.id === selectedAssessmentId;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAssessmentId(a.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-card hover:bg-muted/60 border-border/60"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                    {a.topic}
                  </span>
                  <h4 className="font-bold text-sm text-foreground mt-1.5">{a.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                    {a.basic_question_count + a.intermediate_question_count} Qs • {a.basic_time_seconds}s/{a.intermediate_time_seconds}s
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Candidate Attempts Table */}
        <div className="md:col-span-3 space-y-4">
          <div className="glass p-4 rounded-xl border border-border/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {selectedAssessment ? selectedAssessment.title : "Candidate Attempts"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Review scores, anti-cheat tab flags, and detailed question logs.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidate or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-background/50 border-input rounded-xl"
              />
            </div>
          </div>

          {attemptsLoading ? (
            <LoadingSpinner text="Fetching Candidate Attempts..." />
          ) : filteredAttempts.length === 0 ? (
            <Card className="p-8 text-center glass border-border/40 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground mx-auto" />
              <h4 className="text-sm font-bold text-foreground">No Candidate Submissions Found</h4>
              <p className="text-xs text-muted-foreground">
                No candidates have taken this screening assessment yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAttempts.map((att) => {
                const isCompleted = att.status === "completed";
                const isGoodScore = (att.total_score || 0) >= 70;
                const isPublic = att.candidate.is_public_candidate;

                return (
                  <div
                    key={att.id}
                    className="glass p-4 rounded-xl border border-border/60 hover:border-primary/40 transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{att.candidate.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">({att.candidate.email})</span>

                        {isPublic ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono uppercase">
                            Public Applicant
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono uppercase">
                            Student User
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono flex-wrap">
                        {att.candidate.college && <span>College: {att.candidate.college}</span>}
                        <span>Started: {new Date(att.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {att.tab_switch_count > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" /> {att.tab_switch_count} Tab Switches
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      {isCompleted ? (
                        <div className="text-right">
                          <span className={`text-lg font-black font-mono ${isGoodScore ? "text-emerald-500" : "text-amber-500"}`}>
                            {att.total_score}%
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono block uppercase">Final Score</span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase animate-pulse">
                          In Progress
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReview(att.id)}
                          className="h-9 font-bold text-xs gap-1.5 border-border rounded-xl"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" /> Review Details
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetAttempt(att.id)}
                          className="h-9 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl"
                          title="Reset Candidate Attempt"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Attempt Review Modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="glass border-border/60 max-w-3xl max-h-[85vh] overflow-y-auto">
          {reviewLoading || !reviewData ? (
            <LoadingSpinner text="Loading Detailed Attempt Audit..." />
          ) : (
            <div className="space-y-6 py-2">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                      Candidate Attempt Audit
                      {reviewData.candidate.is_public_candidate ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono uppercase">
                          Public Applicant
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono uppercase">
                          Student User
                        </span>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                      Assessment: {reviewData.assessment_title}
                    </DialogDescription>
                  </div>
                  {reviewData.total_score !== null && (
                    <span className="text-3xl font-black font-mono text-primary">
                      {reviewData.total_score}%
                    </span>
                  )}
                </div>
              </DialogHeader>

              {/* Applicant Identity Card */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/40 space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase text-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" /> Candidate Profile & Submission Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Full Name:</span>
                    <strong className="text-foreground">{reviewData.candidate.name}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <strong className="text-foreground">{reviewData.candidate.email}</strong>
                  </div>

                  {reviewData.candidate.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Phone:</span>
                      <strong className="text-foreground">{reviewData.candidate.phone}</strong>
                    </div>
                  )}

                  {reviewData.candidate.college && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">College:</span>
                      <strong className="text-foreground">{reviewData.candidate.college}</strong>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Started:</span>
                    <strong className="text-foreground">{new Date(reviewData.started_at).toLocaleString()}</strong>
                  </div>

                  {reviewData.completed_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-muted-foreground">Completed:</span>
                      <strong className="text-foreground">{new Date(reviewData.completed_at).toLocaleString()}</strong>
                    </div>
                  )}
                </div>

                {/* Candidate Social & Portfolio Links */}
                {(reviewData.candidate.linkedin_url || reviewData.candidate.github_url || reviewData.candidate.resume_url || reviewData.candidate.instagram_url) && (
                  <div className="pt-2.5 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {reviewData.candidate.linkedin_url && (
                      <a
                        href={reviewData.candidate.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-between hover:bg-blue-500/20 transition-all"
                      >
                        <span>LinkedIn Profile</span>
                        <span className="text-[10px] uppercase font-mono">Open ↗</span>
                      </a>
                    )}

                    {reviewData.candidate.github_url && (
                      <a
                        href={reviewData.candidate.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-background/80 border border-border text-foreground font-bold flex items-center justify-between hover:bg-muted transition-all"
                      >
                        <span>GitHub Profile</span>
                        <span className="text-[10px] uppercase font-mono">Open ↗</span>
                      </a>
                    )}

                    {reviewData.candidate.resume_url && (
                      <a
                        href={reviewData.candidate.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between hover:bg-emerald-500/20 transition-all"
                      >
                        <span>Resume / Portfolio</span>
                        <span className="text-[10px] uppercase font-mono">View Drive ↗</span>
                      </a>
                    )}

                    {reviewData.candidate.instagram_url && (
                      <a
                        href={reviewData.candidate.instagram_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 font-bold flex items-center justify-between hover:bg-pink-500/20 transition-all"
                      >
                        <span>Instagram Profile</span>
                        <span className="text-[10px] uppercase font-mono">Open ↗</span>
                      </a>
                    )}
                  </div>
                )}

                {reviewData.candidate.why_join && (
                  <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground block font-mono text-[10px] uppercase mb-1">
                      Applicant Statement ("Why Join"):
                    </span>
                    {reviewData.candidate.why_join}
                  </div>
                )}
              </div>

              {/* Anti-cheat summary bar & detailed switch log timeline */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/40 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`h-4 w-4 ${reviewData.tab_switch_count > 0 ? "text-amber-500" : "text-emerald-500"}`} />
                    <span>Tab Switch Anti-Cheat Audit:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${reviewData.tab_switch_count > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"}`}>
                      {reviewData.tab_switch_count} Switch Flag{reviewData.tab_switch_count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleResetAttempt(reviewData.attempt_id)}
                    className="h-7 text-xs font-bold gap-1 rounded-lg"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset Attempt
                  </Button>
                </div>

                {/* Detailed Event Log List */}
                {reviewData.tab_switch_logs && reviewData.tab_switch_logs.length > 0 ? (
                  <div className="space-y-1.5 pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Recorded Window/Tab Switch Events:
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {reviewData.tab_switch_logs.map((log, idx) => (
                        <div
                          key={log.id || idx}
                          className="p-2 rounded bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-500">Flag #{idx + 1}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-foreground font-semibold">
                              {log.question_order_index ? `During Question #${log.question_order_index}` : "Test Window Active"}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(log.switched_at).toLocaleTimeString()} ({new Date(log.switched_at).toLocaleDateString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  reviewData.tab_switch_count > 0 && (
                    <div className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/20">
                      {reviewData.tab_switch_count} window/tab switch flags recorded during test execution.
                    </div>
                  )
                )}
              </div>

              {/* Questions Audit List */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  Complete Question & Answer Audit ({reviewData.questions.length} Questions)
                </h4>

                {reviewData.questions.map((q) => {
                  const isCorrect = q.is_correct;
                  const isTimeout = q.was_timeout;

                  return (
                    <div
                      key={q.question_id}
                      className={`p-4 rounded-xl border space-y-3 ${
                        isCorrect
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : "bg-red-500/5 border-red-500/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-card text-foreground border">
                              Q{q.order_index} ({q.difficulty})
                            </span>
                            {isCorrect ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono uppercase">
                                <Check className="h-3 w-3" /> Correct
                              </span>
                            ) : isTimeout ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono uppercase">
                                <Clock className="h-3 w-3" /> Timed Out
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 flex items-center gap-1 font-mono uppercase">
                                <X className="h-3 w-3" /> Incorrect
                              </span>
                            )}
                          </div>

                          <p className="font-bold text-sm text-foreground leading-relaxed">{q.question_text}</p>
                        </div>

                        <span className="text-xs font-mono text-muted-foreground shrink-0">
                          {q.time_taken_seconds !== null ? `${q.time_taken_seconds}s` : "--"} / {q.time_limit_seconds}s
                        </span>
                      </div>

                      {/* Options List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, idx) => {
                          const isAnswerKey = idx === q.correct_option_index;
                          const isCandidatePick = idx === q.selected_option_index;

                          let optionStyle = "bg-background/40 border-border/40 text-muted-foreground";
                          if (isAnswerKey) {
                            optionStyle = "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold";
                          } else if (isCandidatePick && !isCorrect) {
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

                      {/* LLM Explanation */}
                      <div className="p-3 bg-card/60 rounded-lg border border-border/40 text-xs text-muted-foreground leading-relaxed font-sans">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block font-mono text-[10px] uppercase mb-0.5">
                          LLM Explanation & Logic:
                        </span>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
