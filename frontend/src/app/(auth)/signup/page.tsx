"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldAlert, Check, ArrowRight, ClipboardList, GraduationCap, Users } from "lucide-react";
import { getAssetUrl } from "@/lib/utils";


export default function SignupPage() {
  const { user, signup, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "mentor">("mentor");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check if arriving from a passed assessment — only then can a student sign up
  const fromAssessment = searchParams?.get("from") === "assessment";

  // Prefill from URL query params (e.g. redirected after passed assessment)
  useEffect(() => {
    const qpEmail = searchParams?.get("email");
    const qpName = searchParams?.get("name");
    const qpFrom = searchParams?.get("from");
    if (qpEmail) setEmail(qpEmail);
    if (qpName) setName(qpName);
    // Default role to student only when arriving from assessment flow
    if (qpFrom === "assessment") setRole("student");
  }, [searchParams]);

  // If already logged in, redirect to today (students) or dashboard (mentors/admins)
  useEffect(() => {
    if (!loading && user) {
      if (user.status === "pending") {
        router.push(user.role === "student" ? "/student/pending-approval" : "/mentor/pending-approval");
      } else if (user.role === "student") {
        router.push("/today");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signup(name, email, password, role);
      if (result.success) {
        // Will be redirected by useEffect once user state updates
      } else {
        setError(result.error || "Account creation failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- STUDENT: Not arriving from assessment → show the gate page ---
  if (!fromAssessment && role !== "mentor") {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_60%)] -z-10" />

        <div className="max-w-lg w-full space-y-6">
          <div className="text-center flex flex-col items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={38} height={38} className="object-contain" style={{ height: "auto" }} unoptimized priority />
              <span className="font-bold text-2xl tracking-tight text-foreground">Coder<span className="text-primary">Corps</span></span>
            </Link>
            <p className="text-xs text-muted-foreground font-mono">WORKSPACE AUTH SERVICE</p>
          </div>

          <Card className="glass-premium border border-border/40 text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-orange-500" />
              </div>
              <CardTitle className="text-xl font-bold">Students Join via Assessment</CardTitle>
              <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                Direct signup is not available for students. You must complete the Apply → Assessment → Pass flow to join CoderCorps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Flow Steps */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-sm">1</div>
                  <span className="font-semibold text-foreground">Apply</span>
                  <span className="text-muted-foreground text-center">Fill the application form</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">2</div>
                  <span className="font-semibold text-foreground">Assessment</span>
                  <span className="text-muted-foreground text-center">Pass Python screening (≥70%)</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-sm">3</div>
                  <span className="font-semibold text-foreground">Approved</span>
                  <span className="text-muted-foreground text-center">Admin reviews & activates</span>
                </div>
              </div>

              <Link href="/apply" className="block">
                <Button className="w-full font-bold gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20">
                  Start Your Application <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/40" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">Are you a mentor?</span>
                </div>
              </div>

              <button
                onClick={() => setRole("mentor")}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-transparent hover:bg-border/10 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Mentor Signup</p>
                  <p className="text-xs text-muted-foreground">Apply as a mentor to review PRs & guide students</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
              </button>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-border/30 pt-4 mt-2 text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:underline ml-1">
                Sign In
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // --- MENTOR or POST-ASSESSMENT STUDENT SIGNUP FORM ---
  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_60%)] -z-10" />
      
      <div className="max-w-md w-full">
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity mb-2">
            <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={38} height={38} className="object-contain" style={{ height: "auto" }} unoptimized priority />
            <span className="font-bold text-2xl tracking-tight text-foreground">Coder<span className="text-primary">Corps</span></span>
          </Link>
          <p className="text-xs text-muted-foreground font-mono">WORKSPACE AUTH SERVICE</p>
        </div>

        <Card className="glass-premium border border-border/40">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              {role === "student" ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                  <Check className="h-3 w-3" /> Assessment Passed
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-mono font-bold uppercase">
                  <Users className="h-3 w-3" /> Mentor Application
                </div>
              )}
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              {role === "student" ? "Create Your Student Account" : "Join as a Mentor"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {role === "student"
                ? "You've passed the screening! Set your password to finalize your CoderCorps account."
                : "Apply as a mentor to guide students, review PRs, and audit achievements."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex items-start gap-2 animate-in fade-in duration-200">
                <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-foreground font-mono">FULL NAME</label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Atul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  readOnly={fromAssessment}
                  className={fromAssessment ? "opacity-70 cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-foreground font-mono">EMAIL</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="atul@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={fromAssessment}
                  className={fromAssessment ? "opacity-70 cursor-not-allowed" : ""}
                />
                {fromAssessment && (
                  <p className="text-[10px] text-muted-foreground">Use the same email you applied with for verification.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-foreground font-mono">PASSWORD</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Role selector — only show for non-assessment flow, mentor toggle */}
              {!fromAssessment && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground font-mono">ROLE</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      disabled
                      className="p-3 rounded-lg border border-border/30 bg-border/10 text-left flex flex-col justify-between h-20 opacity-40 cursor-not-allowed relative overflow-hidden"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-bold font-mono text-muted-foreground">STUDENT</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-sans">Requires assessment</span>
                      <div className="absolute top-1.5 right-1.5 text-[9px] font-mono font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">APPLY FIRST</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("mentor")}
                      className={`p-3 rounded-lg border text-left flex flex-col justify-between h-20 transition-all duration-200 ${
                        role === "mentor"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 bg-transparent text-muted-foreground hover:bg-border/20"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-bold font-mono">MENTOR</span>
                        {role === "mentor" && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-sans">Review PRs, mentor students, audit achievements.</span>
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className={`w-full font-semibold mt-4 ${role === "student" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`} disabled={submitting}>
                {submitting ? "Creating Account..." : role === "student" ? "Create Student Account" : "Apply as Mentor"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/30 pt-4 mt-2 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline ml-1">
              Sign In
            </Link>
          </CardFooter>
        </Card>

        {role === "mentor" && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Are you a student?{" "}
            <Link href="/apply" className="text-orange-400 hover:underline font-semibold">
              Apply for the screening assessment →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
