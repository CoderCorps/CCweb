"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Clock, 
  ShieldAlert, 
  CheckCircle, 
  ArrowRight, 
  AlertCircle, 
  HelpCircle, 
  Play, 
  Check, 
  X, 
  Award, 
  FileText,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

interface AssessmentStatus {
  title: string;
  topic: string;
  question_count: number;
  basic_time_seconds: number;
  intermediate_time_seconds: number;
  status: string; // pending | in_progress | completed | expired
  expires_at: string;
  is_valid: boolean;
}

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

interface QuestionResultItem {
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

interface CandidateResult {
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
  questions: QuestionResultItem[];
}

export default function PublicCandidateAssessmentPage() {
  const params = useParams();
  const rawToken = params?.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [assessmentStatus, setAssessmentStatus] = useState<AssessmentStatus | null>(null);

  // Active question state
  const [inTest, setInTest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [tabSwitches, setTabSwitches] = useState<number>(0);

  // Result state (Transparent per-question breakdown)
  const [result, setResult] = useState<CandidateResult | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Stable refs so the timer interval never captures stale closures
  const handleAnswerSubmitRef = useRef<(optionIndex: number | null) => Promise<void>>(() => Promise.resolve());
  const submittingRef = useRef(false);
  // Separate ref for fetchCurrentQuestion so it never sets global loading mid-test
  const fetchingRef = useRef(false);

  // 1. Fetch Assessment Status on Mount
  useEffect(() => {
    async function loadStatus() {
      if (!rawToken) return;
      try {
        setLoading(true);
        const res = await api.get(`/assessment/candidate/${rawToken}/status`, { skipAuth: true });
        if (res.ok) {
          const data: AssessmentStatus = await res.json();
          setAssessmentStatus(data);
          if (data.status === "completed") {
            // Load result
            loadResult();
          } else if (data.status === "in_progress") {
            // Load current active question
            fetchCurrentQuestion();
          }
        } else {
          setStatusError("Invalid or expired assessment link.");
        }
      } catch (err) {
        console.error(err);
        setStatusError("Invalid or expired assessment link.");
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [rawToken]);

  // Load result if completed
  const loadResult = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/assessment/candidate/${rawToken}/result`, { skipAuth: true });
      if (res.ok) {
        const data: CandidateResult = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [rawToken]);

  // Helper to parse ISO date string reliably in UTC
  const parseUTCDate = useCallback((dateVal: string | null | undefined): number => {
    if (!dateVal) return Date.now();
    let str = String(dateVal).trim();
    if (!str.endsWith("Z") && !str.includes("+") && !str.includes("-")) {
      str += "Z";
    }
    const parsed = new Date(str).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  }, []);

  // Fetch Current Question — used as error recovery fallback.
  // Uses fetchingRef instead of setLoading so it never triggers a full re-render
  // that would wipe out the active question display.
  const fetchCurrentQuestion = useCallback(async () => {
    if (fetchingRef.current) return; // prevent double-fetch
    fetchingRef.current = true;
    try {
      const res = await api.get(`/assessment/candidate/${rawToken}/current-question`, { skipAuth: true });
      if (res.ok) {
        const data = await res.json();
        if (data.is_completed && data.result) {
          setResult(data.result);
          setInTest(false);
          return;
        }

        const q: QuestionData = data.next_question;
        setSelectedOption(null);
        setTimeLeft(() => {
          let secs = q.time_limit_seconds;
          if (q.served_at) {
            const servedTime = parseUTCDate(q.served_at);
            const nowTime = Date.now();
            const elapsedSecs = Math.floor((nowTime - servedTime) / 1000);
            if (elapsedSecs >= 0 && elapsedSecs < q.time_limit_seconds) {
              secs = q.time_limit_seconds - elapsedSecs;
            }
          }
          return secs;
        });
        setQuestion(q);
        setInTest(true);
      } else {
        setStatusError("Failed to fetch current question.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      fetchingRef.current = false;
    }
  }, [rawToken, parseUTCDate]);

  // Anti-cheat tab switch listener
  useEffect(() => {
    if (!inTest) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
        api.post(`/assessment/candidate/${rawToken}/flag`, {}, { skipAuth: true }).catch(() => {});
        toast.warning("Warning: Window/Tab switch detected and logged.", {
          icon: <ShieldAlert className="h-4 w-4 text-amber-500" />
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [inTest, rawToken]);

  // Start test
  const handleStartTest = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/assessment/candidate/${rawToken}/start`, {}, { skipAuth: true });
      if (res.ok) {
        const data = await res.json();
        const q: QuestionData = data.first_question;
        setQuestion(q);
        setSelectedOption(null);
        setTimeLeft(q.time_limit_seconds);
        setInTest(true);
        toast.success("Assessment started! Good luck.");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Could not start assessment.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error starting assessment.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer
  // NOTE: useCallback deps intentionally exclude `submitting` — we read it via submittingRef
  // to keep the function reference stable and avoid re-triggering the timer useEffect.
  const handleAnswerSubmit = useCallback(async (optionIndex: number | null) => {
    if (submittingRef.current || !question) return;
    submittingRef.current = true;
    setSubmitting(true);

    // Clear the running timer immediately so it doesn't fire again mid-submit
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const res = await api.post(
        `/assessment/candidate/${rawToken}/answer`,
        {
          question_id: question.id,
          selected_option_index: optionIndex
        },
        { skipAuth: true }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.is_completed) {
          toast.success("Assessment completed! Review your results below.");
          setResult(data.result);
          setInTest(false);
        } else {
          const nextQ: QuestionData = data.next_question;
          setSelectedOption(null);
          setTimeLeft(nextQ.time_limit_seconds);
          setQuestion(nextQ); // triggers timer restart via question?.id dep
        }
      } else {
        await fetchCurrentQuestion();
      }
    } catch (err) {
      console.error(err);
      await fetchCurrentQuestion();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [question, rawToken, fetchCurrentQuestion]);

  // Keep the ref in sync with the latest handleAnswerSubmit without triggering the timer effect
  useEffect(() => {
    handleAnswerSubmitRef.current = handleAnswerSubmit;
  }, [handleAnswerSubmit]);

  // Timer Countdown Loop
  // Deps: only primitive/stable values — question?.id restarts the timer when a NEW question
  // arrives; inTest gates it on/off. We deliberately exclude `handleAnswerSubmit` and
  // `submitting` to prevent the timer from restarting mid-answer-submission.
  useEffect(() => {
    if (!inTest || !question?.id) return;

    // Clean up any leftover interval before starting a fresh one
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          toast.error("Time expired for this question!", {
            icon: <Clock className="h-4 w-4 text-red-500" />
          });
          // Call via ref — always gets the latest version without being a dep
          handleAnswerSubmitRef.current(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTest, question?.id]);

  if (loading) {
    return <LoadingSpinner text="Validating Assessment Access..." />;
  }

  // --- INVALID / EXPIRED LINK STATE ---
  if (statusError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
        <Card className="max-w-md w-full glass border-red-500/20 text-center p-8 space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Invalid or Expired Link</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This assessment invitation link is either invalid, expired, or has already been completed. Please contact your admissions team or re-apply.
          </p>
          <Button onClick={() => router.push("/apply")} className="w-full font-bold rounded-xl">
            Re-Apply for Assessment
          </Button>
        </Card>
      </div>
    );
  }

  // --- TRANSPARENT RESULT STATE (Reveals correct answers & explanations!) ---
  if (result) {
    const mins = Math.floor(result.total_time_seconds / 60);
    const secs = Math.round(result.total_time_seconds % 60);

    return (
      <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6 animate-in fade-in duration-300">
        {/* Score Banner */}
        <div className="glass p-8 rounded-3xl border border-border/60 text-center space-y-4 shadow-md relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> Official Candidate Result
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            {result.assessment_title}
          </h1>

          <div className="flex flex-col items-center justify-center pt-2">
            <div className="text-5xl sm:text-6xl font-black text-primary font-mono tracking-tight">
              {result.total_score}%
            </div>
            <span className="text-xs text-muted-foreground font-mono font-semibold uppercase mt-1">
              Score: {result.correct_count} of {result.total_questions} Correct ({mins}m {secs}s)
            </span>
          </div>
        </div>

        {/* Question-by-Question Transparent Breakdown */}
        <div className="space-y-4">
          <h3 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider px-1">
            Question & Answer Review ({result.questions.length} Items)
          </h3>

          {result.questions.map((q) => {
            const isCorrect = q.is_correct;
            const isTimeout = q.was_timeout;

            return (
              <Card
                key={q.question_id}
                className={`glass border transition-all duration-200 ${
                  isCorrect ? "border-emerald-500/25 bg-emerald-500/5" : "border-red-500/25 bg-red-500/5"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-card text-foreground border">
                          Q{q.order_index} ({q.difficulty})
                        </span>
                        {isCorrect ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono uppercase">
                            <Check className="h-3 w-3" /> Correct
                          </span>
                        ) : isTimeout ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono uppercase">
                            <Clock className="h-3 w-3" /> Timed Out
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 flex items-center gap-1 font-mono uppercase">
                            <X className="h-3 w-3" /> Incorrect
                          </span>
                        )}
                      </div>

                      <CardTitle className="text-base font-bold text-foreground mt-2 leading-relaxed">
                        {q.question_text}
                      </CardTitle>
                    </div>

                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {q.time_taken_seconds !== null ? `${q.time_taken_seconds}s` : "--"} / {q.time_limit_seconds}s
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
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
                        <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${optionStyle}`}>
                          <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                          {isAnswerKey && <span className="text-[9px] font-mono uppercase text-emerald-600 dark:text-emerald-400">[Correct Answer]</span>}
                          {isCandidatePick && !isAnswerKey && <span className="text-[9px] font-mono uppercase text-red-500">[Your Pick]</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* LLM Explanation */}
                  <div className="p-3.5 bg-card/60 rounded-xl border border-border/40 text-xs text-muted-foreground leading-relaxed font-sans">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 block font-mono text-[10px] uppercase mb-1">
                      Explanation & Logic:
                    </span>
                    {q.explanation}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // --- TIMED TEST TAKING STATE ---
  if (inTest && question) {
    const isBasic = question.difficulty === "basic";
    const timerPercentage = Math.max(0, Math.min(100, (timeLeft / question.time_limit_seconds) * 100));

    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6 animate-in fade-in duration-200 select-none">
        {/* Top Header */}
        <div className="glass p-4 sm:p-5 rounded-2xl border border-border/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-card text-foreground border border-border">
              Question {question.order_index} of {question.total_questions}
            </span>
            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider ${
              isBasic ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
            }`}>
              {question.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono font-extrabold text-sm">
            <Clock className={`h-4 w-4 ${timeLeft < 10 ? "text-red-500 animate-bounce" : "text-primary"}`} />
            <span className={timeLeft < 10 ? "text-red-500" : "text-foreground"}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Progress Timer Bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${
              timeLeft < 10 ? "bg-red-500" : isBasic ? "bg-emerald-500" : "bg-indigo-500"
            }`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>

        {/* Question Card */}
        <Card className="glass border-border/60 shadow-md">
          <CardHeader className="space-y-4">
            <CardTitle className="text-lg sm:text-xl font-bold text-foreground leading-relaxed">
              {question.question_text}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {question.options.map((optText, idx) => {
              const isSelected = selectedOption === idx;
              const letter = String.fromCharCode(65 + idx);

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
                      isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
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

        {/* Tab switch warning */}
        <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/15 text-[11px] text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            Do not leave or switch tabs. Answers are locked permanently once submitted.
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

  // --- INITIAL START LANDING PAGE ---
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <Card className="max-w-xl w-full glass border-border/60 p-6 sm:p-8 space-y-6 text-center shadow-lg relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider mx-auto">
          <Award className="h-3.5 w-3.5" /> Ready for Assessment
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {assessmentStatus?.title || "Python Screening Assessment"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            You are about to start your 1-time timed Python technical screening test.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-background/50 border border-border/40 text-xs font-mono text-left">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Questions</span>
            <p className="font-bold text-foreground">{assessmentStatus?.question_count} Multiple-Choice</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Strict Timers</span>
            <p className="font-bold text-foreground">
              {assessmentStatus?.basic_time_seconds}s (basic) / {assessmentStatus?.intermediate_time_seconds}s (inter.)
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-indigo-500/5 rounded-xl border border-indigo-500/15 text-[11px] text-muted-foreground text-left space-y-1">
          <p className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Important Instructions:
          </p>
          <p>• Once you click Start, Question 1's timer begins immediately.</p>
          <p>• Tab switches and window blurs are automatically logged.</p>
          <p>• Right after finishing the final question, your full score and question breakdown will be revealed!</p>
        </div>

        <Button
          onClick={handleStartTest}
          className="w-full font-bold h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground gap-2 text-base shadow-md"
        >
          <Play className="h-4 w-4" /> Start Screening Test Now
        </Button>
      </Card>
    </div>
  );
}
