"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Award, Clock, CheckCircle2, FileText, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface AttemptResult {
  attempt_id: number;
  total_score: number;
  total_questions: number;
  correct_count: number;
  basic_correct_count: number;
  basic_total: number;
  intermediate_correct_count: number;
  intermediate_total: number;
  total_time_seconds: number;
  status: string;
  completed_at: string | null;
}

export default function AssessmentResultPage() {
  const params = useParams();
  const attemptId = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AttemptResult | null>(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        setLoading(true);
        const res = await api.get(`/assessments/assessment-attempts/${attemptId}/result`);
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        } else {
          toast.error("Could not load assessment result.");
          router.push("/assessments");
        }
      } catch (err) {
        console.error(err);
        toast.error("Network error fetching result.");
      } finally {
        setLoading(false);
      }
    }

    if (attemptId) {
      fetchResult();
    }
  }, [attemptId, router]);

  if (loading || !result) {
    return <LoadingSpinner text="Computing Final Assessment Score..." />;
  }

  const mins = Math.floor(result.total_time_seconds / 60);
  const secs = Math.round(result.total_time_seconds % 60);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Header Banner */}
      <div className="glass p-8 rounded-3xl border border-border/60 text-center space-y-4 shadow-md relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4" /> Attempt Completed & Verified
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Assessment Outcome
        </h1>

        <div className="flex flex-col items-center justify-center pt-2">
          <div className="text-5xl sm:text-6xl font-black text-primary font-mono tracking-tight">
            {result.total_score}%
          </div>
          <span className="text-xs text-muted-foreground font-mono font-semibold uppercase mt-1">
            Overall Score ({result.correct_count} of {result.total_questions} Correct)
          </span>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Level Performance */}
        <Card className="glass border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase">
                Basic Difficulty
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {result.basic_correct_count} / {result.basic_total} Correct
              </span>
            </div>
            <CardTitle className="text-lg font-bold text-foreground mt-2">
              Language Fundamentals
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-2">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${result.basic_total > 0 ? (result.basic_correct_count / result.basic_total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Variables, control loops, basic data structures, and syntax fluency.
            </p>
          </CardContent>
        </Card>

        {/* Intermediate Level Performance */}
        <Card className="glass border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 uppercase">
                Intermediate Difficulty
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {result.intermediate_correct_count} / {result.intermediate_total} Correct
              </span>
            </div>
            <CardTitle className="text-lg font-bold text-foreground mt-2">
              Advanced Concepts & Output Parsing
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-2">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${result.intermediate_total > 0 ? (result.intermediate_correct_count / result.intermediate_total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Comprehensions, exceptions, object-oriented concepts, and code snippet outputs.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Meta Stats & Next Steps */}
      <Card className="glass border-border/60">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono border-b border-border/40 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" /> Total Time Elapsed:
            </div>
            <span className="font-bold text-foreground">
              {mins > 0 ? `${mins}m ${secs}s` : `${secs} seconds`}
            </span>
          </div>

          <div className="space-y-1.5 pt-2">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Internship Application Status
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your mentor will review this assessment score as part of your internship application and project readiness audit. Answers and explanations are kept confidential to maintain question bank integrity.
            </p>
          </div>
        </CardContent>

        <CardFooter className="pt-0 pb-6 px-6">
          <Button 
            onClick={() => router.push("/assessments")}
            className="w-full font-bold gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Assessments
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
