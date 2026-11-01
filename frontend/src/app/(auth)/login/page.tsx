"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import { ShieldAlert, Eye, EyeOff, Loader2 } from "lucide-react";
import { getAssetUrl } from "@/lib/utils";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to today (students) or dashboard (mentors/admins)
  useEffect(() => {
    if (!loading && user) {
      if (user.status === "pending") {
        router.replace(user.role === "student" ? "/student/pending-approval" : "/mentor/pending-approval");
      } else if (user.role === "student") {
        router.replace("/today");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const result = await login(email.trim(), password);
      if (result.success && result.user) {
        // Immediate redirection without waiting for an extra React render cycle
        const u = result.user;
        if (u.status === "pending") {
          router.replace(u.role === "student" ? "/student/pending-approval" : "/mentor/pending-approval");
        } else if (u.role === "student") {
          router.replace("/today");
        } else {
          router.replace("/dashboard");
        }
        // Keep submitting=true while navigation is occurring to prevent button flashing
        return;
      } else {
        setError(result.error || "Invalid email or password. Please try again.");
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  };

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

        <Card className="glass-premium border border-border/40 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Sign In</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Log in to access your projects, sprints, and portfolio.
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
                <label htmlFor="email" className="text-xs font-semibold text-foreground font-mono">EMAIL</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="atul@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-xs font-semibold text-foreground font-mono">PASSWORD</label>
                  <Link href="/forgot-password" tabIndex={submitting ? -1 : 0} className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full font-semibold mt-4 gap-2" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/30 pt-4 mt-2 text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-indigo-400 hover:underline ml-1">
              Create an account
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
