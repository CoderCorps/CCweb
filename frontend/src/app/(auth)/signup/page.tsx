"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldAlert, Check } from "lucide-react";

export default function SignupPage() {
  const { user, signup, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "mentor">("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const success = await signup(name, email, password, role);
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Account creation failed. Email may already be in use.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_60%)] -z-10" />
      
      <div className="max-w-md w-full">
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity mb-2">
            <Image src="/assets/logo.gif" alt="CoderCorps" width={38} height={38} className="object-contain" />
            <span className="font-bold text-2xl tracking-tight text-foreground">Coder<span className="text-primary">Corps</span></span>
          </Link>
          <p className="text-xs text-muted-foreground font-mono">WORKSPACE AUTH SERVICE</p>
        </div>

        <Card className="glass-premium border border-border/40">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Create Account</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Register as a student or mentor to join our engineering workspace.
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
                />
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
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-mono">CHOOSE YOUR ROLE</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between h-20 transition-all duration-200 ${
                      role === "student"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 bg-transparent text-muted-foreground hover:bg-border/20"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold font-mono">STUDENT</span>
                      {role === "student" && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-sans">Build projects, submit PRs, get review audits.</span>
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
                    <span className="text-[10px] text-muted-foreground font-sans">Review pull requests, mentor students, audit achievements.</span>
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full font-semibold mt-4" disabled={submitting}>
                {submitting ? "Creating Account..." : "Create Account"}
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
      </div>
    </div>
  );
}
