"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ShieldAlert, KeyRound, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { getAssetUrl } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const rawToken = params?.token as string;

  // Verification state
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Password Form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Verify token on mount
  useEffect(() => {
    if (!rawToken) {
      setVerifying(false);
      setVerifyError("No reset token provided.");
      return;
    }

    async function verifyToken() {
      try {
        setVerifying(true);
        const res = await fetch(`${API_BASE_URL}/auth/reset-password/${encodeURIComponent(rawToken)}/verify`);
        if (res.ok) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setVerifyError("This reset link is invalid or has expired.");
        }
      } catch (err) {
        setTokenValid(false);
        setVerifyError("Unable to verify reset link. Please check your internet connection.");
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [rawToken]);

  // Password strength calculator
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = calculateStrength(newPassword);
  const getStrengthLabel = () => {
    if (!newPassword) return "";
    if (newPassword.length < 12) return "Too Short (Min 12 Chars)";
    if (strengthScore <= 1) return "Weak";
    if (strengthScore === 2) return "Medium";
    if (strengthScore === 3) return "Strong";
    return "Excellent";
  };

  const getStrengthColor = () => {
    if (newPassword.length < 12) return "bg-red-500/80 text-red-400";
    if (strengthScore <= 1) return "bg-amber-500 text-amber-400";
    if (strengthScore === 2) return "bg-yellow-500 text-yellow-400";
    if (strengthScore === 3) return "bg-indigo-500 text-indigo-400";
    return "bg-emerald-500 text-emerald-400";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: rawToken,
          new_password: newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to reset password.");
      }

      setSubmitSuccess(true);

      // Redirect to login after 3 seconds (do not auto-log-in)
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
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
          <p className="text-xs text-muted-foreground font-mono">ACCOUNT SECURITY SERVICE</p>
        </div>

        <Card className="glass-premium border border-border/40">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider mb-1">
              <KeyRound className="h-4 w-4" /> Password Reset
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Set New Password</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Create a new secure password for your CoderCorps account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Loading Verification State */}
            {verifying ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground font-medium">Verifying reset token link...</p>
              </div>
            ) : !tokenValid ? (
              /* Invalid or Expired Token State */
              <div className="space-y-5 text-center py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-foreground">Link Invalid or Expired</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {verifyError || "This password reset link is invalid or has expired."}
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/forgot-password">
                    <Button className="w-full text-xs font-semibold gap-2">
                      Request a New Reset Link →
                    </Button>
                  </Link>
                </div>
              </div>
            ) : submitSuccess ? (
              /* Successful Reset State */
              <div className="space-y-5 text-center py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-foreground">Password Updated!</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your password has been successfully updated. All active sessions have been logged out for security.
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center justify-center gap-2 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to login page...
                </div>
                <div className="pt-2">
                  <Link href="/login">
                    <Button className="w-full text-xs font-semibold">
                      Go to Sign In Now →
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Reset Password Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex items-start gap-2 animate-in fade-in duration-200">
                    <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* New Password Input */}
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="text-xs font-semibold text-foreground font-mono">
                    NEW PASSWORD
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 12 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={submitting}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Strength Bar */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-muted-foreground">Strength:</span>
                        <span className={`font-bold ${getStrengthColor().split(' ')[1]}`}>
                          {getStrengthLabel()}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            newPassword.length < 12
                              ? "w-1/4 bg-red-500"
                              : strengthScore <= 1
                              ? "w-2/4 bg-amber-500"
                              : strengthScore === 2
                              ? "w-3/4 bg-yellow-500"
                              : "w-full bg-emerald-500"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground font-mono">
                    CONFIRM NEW PASSWORD
                  </label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={submitting}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                      <X className="h-3 w-3" /> Passwords do not match
                    </p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && (
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" /> Passwords match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full font-semibold mt-2"
                  disabled={submitting || newPassword.length < 12 || newPassword !== confirmPassword}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Updating Password...
                    </span>
                  ) : (
                    "Reset Password →"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
