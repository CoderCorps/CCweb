"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Clock, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAssetUrl } from "@/lib/utils";

export default function StudentPendingApprovalPage() {
  const { user, logout, refreshUser } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll user status every 10 seconds for real-time auto-approval redirect to /today
  useEffect(() => {
    const pollInterval = setInterval(() => {
      refreshUser();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [refreshUser]);

  if (!user || user.status !== "pending") {
    return null;
  }

  const parseUTCDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
    return isNaN(date.getTime()) ? new Date(dateStr) : date;
  };

  const createdAt = parseUTCDate(user.created_at) || new Date();
  const isCreatedDateValid = !isNaN(createdAt.getTime());

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_60%)] -z-10" />

      {/* Brand Logo */}
      <div className="mb-8 flex items-center gap-2">
        <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={40} height={40} className="object-contain" style={{ height: "auto" }} unoptimized priority />
        <span className="font-bold text-2xl text-foreground">Coder<span className="text-primary">Corps</span></span>
      </div>

      <Card className="max-w-md w-full text-center border-border/40 shadow-xl bg-card glass-premium">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Clock className="h-16 w-16 text-amber-500 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Student Account Pending Approval</CardTitle>
          <CardDescription className="text-base mt-2 text-muted-foreground">
            Your assessment results and profile are under review by CoderCorps Admin
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you for completing your screening assessment, <span className="font-bold text-foreground">{user.name}</span>! An administrator is reviewing your test score and candidate details. Once approved, your full student workspace, daily tasks, and project access will be unlocked.
          </p>

          <div className="space-y-4">
            <div className="bg-muted/30 border border-border/40 p-4 rounded-xl text-left font-mono">
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">ACCOUNT CREATED AT:</p>
              <p className="text-sm text-foreground font-bold">
                {isCreatedDateValid ? createdAt.toLocaleString() : "Processing..."}
              </p>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold uppercase">
                <CheckCircle2 className="h-3.5 w-3.5" /> Screening Submitted
              </div>
              <p className="text-center text-xs text-muted-foreground leading-relaxed mt-1">
                This page auto-refreshes every few seconds. As soon as an admin approves your profile, you will be redirected automatically to your student dashboard.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/40 bg-muted/10 p-4 rounded-b-xl">
          <Button variant="ghost" onClick={logout} className="gap-2 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

