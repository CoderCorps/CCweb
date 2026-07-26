"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Award, 
  Clock, 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  AlertCircle,
  HelpCircle,
  FileCheck,
  ShieldAlert
} from "lucide-react";
import { toast } from "sonner";

interface AssessmentItem {
  id: number;
  title: string;
  topic: string;
  basic_question_count: number;
  intermediate_question_count: number;
  basic_time_seconds: number;
  intermediate_time_seconds: number;
  is_active: boolean;
  attempt_status?: string | null;  // in_progress | completed | abandoned | null
  attempt_id?: number | null;
}

export default function CandidateAssessmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);

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
      } else {
        toast.error("Failed to load technical assessments.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error loading assessments.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOrResume = async (assessment: AssessmentItem) => {
    if (assessment.attempt_status === "completed" && assessment.attempt_id) {
      router.push(`/assessments/${assessment.attempt_id}/result`);
      return;
    }

    try {
      setStartingId(assessment.id);
      const res = await api.post(`/assessments/${assessment.id}/start`, {});
      if (res.ok) {
        const data = await res.json();
        toast.success("Assessment started! Good luck.");
        router.push(`/assessments/${data.attempt_id}/take`);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Could not start assessment.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate screening test.");
    } finally {
      setStartingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading Technical Assessments..." />;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass p-6 sm:p-8 rounded-2xl border border-border/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            <Award className="h-3.5 w-3.5" /> Technical Verification
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Skill & Code Screening Tests
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            Take timed, AI-generated Python programming assessments. Your results are recorded directly for mentor review and internship placement decisions.
          </p>
        </div>

        {user?.role === "mentor" || user?.role === "admin" ? (
          <Button 
            onClick={() => router.push("/mentor/assessments")}
            className="font-bold gap-2 shadow-md bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <ShieldAlert className="h-4 w-4" /> Mentor Dashboard
          </Button>
        ) : null}
      </div>

      {/* Assessment Grid */}
      {assessments.length === 0 ? (
        <Card className="p-8 text-center glass border-border/40 space-y-3">
          <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No Active Assessments</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            There are currently no active screening assessments scheduled. Please check back soon or consult your mentor.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assessments.map((a) => {
            const totalQs = a.basic_question_count + a.intermediate_question_count;
            const approxMinutes = Math.ceil(
              (a.basic_question_count * a.basic_time_seconds + 
               a.intermediate_question_count * a.intermediate_time_seconds) / 60
            );

            let statusBadge = (
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-mono uppercase">
                Not Started
              </span>
            );

            if (a.attempt_status === "completed") {
              statusBadge = (
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono uppercase flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </span>
              );
            } else if (a.attempt_status === "in_progress") {
              statusBadge = (
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono uppercase animate-pulse flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> In Progress
                </span>
              );
            }

            return (
              <Card key={a.id} className="glass border-border/60 hover:border-primary/40 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                      {a.topic}
                    </span>
                    {statusBadge}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">{a.title}</CardTitle>
                    <CardDescription className="text-xs mt-1 text-muted-foreground">
                      Structured {totalQs}-question MCQ evaluation covering fundamental and intermediate Python concepts.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Breakdown stats */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-background/50 border border-border/40 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Questions</span>
                      <p className="font-bold text-foreground">{totalQs} MCQs ({a.basic_question_count} basic, {a.intermediate_question_count} inter.)</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Est. Time</span>
                      <p className="font-bold text-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-indigo-500" /> ~{approxMinutes} mins
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/15 text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Anti-Cheat Enforced:
                    </p>
                    <p>Per-question strict timers. Tab switches are logged for mentor audit. No answer key is leaked during or after the attempt.</p>
                  </div>
                </CardContent>

                <CardFooter className="pt-2">
                  <Button
                    onClick={() => handleStartOrResume(a)}
                    disabled={startingId === a.id}
                    className={`w-full font-bold h-11 rounded-xl gap-2 shadow-sm ${
                      a.attempt_status === "completed"
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    }`}
                  >
                    {startingId === a.id ? (
                      "Initializing Test..."
                    ) : a.attempt_status === "completed" ? (
                      <>
                        <FileCheck className="h-4 w-4" /> View My Result Score
                      </>
                    ) : a.attempt_status === "in_progress" ? (
                      <>
                        <RotateCcw className="h-4 w-4" /> Resume Assessment
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" /> Start Assessment
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
