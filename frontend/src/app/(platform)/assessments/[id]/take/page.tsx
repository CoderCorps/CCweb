"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Clock, ShieldAlert, CheckCircle, ArrowRight, AlertCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface QuestionData {
  id: number;
  question_text: string;
  options: string[];
  difficulty: "basic" | "intermediate";
  order_index: number;
  time_limit_seconds: number;
  served_at: string | null;
  total_questions: number;
}

export default function TakeAssessmentPage() {
  const params = useParams();
  const attemptId = params?.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [tabSwitches, setTabSwitches] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch current question from backend
  const fetchCurrentQuestion = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/assessments/assessment-attempts/${attemptId}/current-question`);
      if (res.ok) {
        const data = await res.json();
        if (data.is_completed) {
          toast.success("Assessment completed!");
          router.replace(`/assessments/${attemptId}/result`);
          return;
        }

        const q: QuestionData = data.next_question;
        setQuestion(q);
        setSelectedOption(null);

        // Compute remaining seconds from server timestamp served_at if present
        let secs = q.time_limit_seconds;
        if (q.served_at) {
          const servedTime = new Date(q.served_at).getTime();
          const nowTime = Date.now();
          const elapsedSecs = Math.floor((nowTime - servedTime) / 1000);
          secs = Math.max(0, q.time_limit_seconds - elapsedSecs);
        }
        setTimeLeft(secs);

      } else {
        toast.error("Failed to load question.");
        router.replace("/assessments");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error fetching question.");
    } finally {
      setLoading(false);
    }
  }, [attemptId, router]);

  useEffect(() => {
    if (attemptId) {
      fetchCurrentQuestion();
    }
  }, [attemptId, fetchCurrentQuestion]);

  // 2. Anti-cheat visibility change listener (Tab switch tracking)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
        api.post(`/assessments/assessment-attempts/${attemptId}/flag`, {}).catch(() => {});
        toast.warning("Warning: Window/Tab switch detected and logged.", {
          icon: <ShieldAlert className="h-4 w-4 text-amber-500" />
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [attemptId]);

  // 3. Submit function
  const handleAnswerSubmit = useCallback(async (optionIndex: number | null) => {
    if (submitting || !question) return;
    setSubmitting(true);

    try {
      const res = await api.post(`/assessments/assessment-attempts/${attemptId}/answer`, {
        question_id: question.id,
        selected_option_index: optionIndex
      });

      if (res.ok) {
        const data = await res.json();
        if (data.is_completed) {
          toast.success("Assessment Completed!");
          router.replace(`/assessments/${attemptId}/result`);
        } else {
          // Advance to next question
          const nextQ: QuestionData = data.next_question;
          setQuestion(nextQ);
          setSelectedOption(null);
          setTimeLeft(nextQ.time_limit_seconds);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Failed to record response.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting answer.");
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, question, router, submitting]);

  // 4. Cosmetic timer loop & auto-submit on timeout
  useEffect(() => {
    if (loading || !question) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          toast.error("Time expired for this question!", {
            icon: <Clock className="h-4 w-4 text-red-500" />
          });
          // Auto submit null on timeout
          handleAnswerSubmit(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question, loading, handleAnswerSubmit]);

  if (loading || !question) {
    return <LoadingSpinner text="Preparing Next Question..." />;
  }

  const isBasic = question.difficulty === "basic";
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / question.time_limit_seconds) * 100));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200 select-none">
      {/* Top Banner & Progress Header */}
      <div className="glass p-4 sm:p-5 rounded-2xl border border-border/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-card text-foreground border border-border">
            Question {question.order_index} of {question.total_questions}
          </span>
          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider ${
            isBasic 
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
              : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
          }`}>
            {question.difficulty}
          </span>
        </div>

        {/* Timer Display */}
        <div className="flex items-center gap-2 font-mono font-extrabold text-sm">
          <Clock className={`h-4 w-4 ${timeLeft < 10 ? "text-red-500 animate-bounce" : "text-primary"}`} />
          <span className={timeLeft < 10 ? "text-red-500" : "text-foreground"}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Visual Timer Bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${
            timeLeft < 10 ? "bg-red-500" : isBasic ? "bg-emerald-500" : "bg-indigo-500"
          }`}
          style={{ width: `${timerPercentage}%` }}
        />
      </div>

      {/* Main Question Card */}
      <Card className="glass border-border/60 shadow-md">
        <CardHeader className="space-y-4">
          <CardTitle className="text-lg sm:text-xl font-bold text-foreground leading-relaxed">
            {question.question_text}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {question.options.map((optText, idx) => {
            const isSelected = selectedOption === idx;
            const letter = String.fromCharCode(65 + idx);  // A, B, C, D

            return (
              <div
                key={idx}
                onClick={() => !submitting && setSelectedOption(idx)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? "bg-primary/10 border-primary shadow-sm text-foreground"
                    : "bg-background/40 hover:bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-7 w-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border"
                  }`}>
                    {letter}
                  </span>
                  <span className="text-sm font-medium leading-normal">{optText}</span>
                </div>

                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                }`}>
                  {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>
            );
          })}
        </CardContent>

        <CardFooter className="flex justify-between items-center pt-2">
          <span className="text-[11px] text-muted-foreground font-mono">
            {selectedOption === null ? "Select an option to lock in your answer." : `Selected option ${String.fromCharCode(65 + selectedOption)}`}
          </span>

          <Button
            onClick={() => handleAnswerSubmit(selectedOption)}
            disabled={submitting}
            className="font-bold gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-6"
          >
            {submitting ? (
              "Submitting..."
            ) : selectedOption === null ? (
              <>
                Skip Question <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Lock In Answer <CheckCircle className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Warning Footer */}
      <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/15 text-[11px] text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
          Do not leave or switch tabs. Navigations forward are permanent once submitted.
        </span>
        {tabSwitches > 0 && (
          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
            Flags: {tabSwitches}
          </span>
        )}
      </div>
    </div>
  );
}
