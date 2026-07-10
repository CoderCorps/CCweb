"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldAlert, CheckCircle2, ArrowLeft } from "lucide-react";
import { getAssetUrl } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post(
        "/auth/forgot-password",
        { email },
        { skipAuth: true }
      );

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Request failed. Please try again later.");
      }
    } catch (err) {
      setError("Failed to connect to the authentication server.");
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
            <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={38} height={38} className="object-contain" />
            <span className="font-bold text-2xl tracking-tight text-foreground">Coder<span className="text-primary">Corps</span></span>
          </Link>
          <p className="text-xs text-muted-foreground font-mono">WORKSPACE AUTH SERVICE</p>
        </div>

        <Card className="glass-premium border border-border/40">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Forgot Password</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Provide your email to receive a password reset authorization token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex items-start gap-2 animate-in fade-in duration-200">
                <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center flex flex-col items-center gap-3 animate-in fade-in duration-300">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold text-foreground font-mono">CHECK YOUR INBOX</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    If the email matches a registered CoderCorps workspace credential, we've sent reset coordinates.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-foreground font-mono">EMAIL ADDRESS</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student1@codercorps.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full font-semibold mt-4" disabled={submitting}>
                  {submitting ? "Requesting Reset..." : "Send Reset Link"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/30 pt-4 mt-2 text-xs">
            <Link href="/login" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
