"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ShieldAlert, KeyRound, Loader2 } from "lucide-react";
import { getAssetUrl } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.status === 429) {
        setError("Too many password reset attempts. Please try again later.");
        setSubmitting(false);
        return;
      }

      // Always show generic success confirmation regardless of backend detail
      setSubmitted(true);
    } catch (err) {
      // Even on network error or server error, set submitted to prevent leaking email info, but log error
      console.error("[FORGOT PASSWORD ERROR]", err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_60%)] -z-10" />

      <div className="max-w-md w-full">
        {/* Header Logo */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity mb-2">
            <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={38} height={38} className="object-contain" style={{ height: "auto" }} unoptimized priority />
            <span className="font-bold text-2xl tracking-tight text-foreground">Coder<span className="text-primary">Corps</span></span>
          </Link>
          <p className="text-xs text-muted-foreground font-mono">ACCOUNT RECOVERY SERVICE</p>
        </div>

        <Card className="glass-premium border border-border/40">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider mb-1">
              <KeyRound className="h-4 w-4" /> Password Recovery
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Forgot Password?</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your registered email address and we will send you a 30-minute password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex items-start gap-2 animate-in fade-in duration-200">
                <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {submitted ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-primary">
                  <CheckCircle2 className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-foreground">Check Your Email</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If an account exists with <strong>{email}</strong>, a password reset link has been sent. Please check your inbox and spam folders.
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-[11px] text-muted-foreground border border-border/50 text-left">
                  ⏱️ <strong>Note:</strong> Reset links expire after 30 minutes and can only be used once.
                </div>
                <div className="pt-2">
                  <Link href="/login">
                    <Button variant="outline" className="w-full text-xs font-semibold gap-2">
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-foreground font-mono">
                    ACCOUNT EMAIL
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <Button type="submit" className="w-full font-semibold" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending Reset Link...
                    </span>
                  ) : (
                    "Send Reset Link →"
                  )}
                </Button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Return to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
