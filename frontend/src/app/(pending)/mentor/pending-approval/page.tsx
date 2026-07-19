"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Clock, Bell, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAssetUrl } from "@/lib/utils";
import { MENTOR_APPROVAL_COOLDOWN_SECONDS } from "@/lib/constants";

export default function PendingApprovalPage() {
  const { user, logout, refreshUser } = useAuth();
  const [now, setNow] = useState(new Date());
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll user status every 10 seconds for real-time auto-approval
  useEffect(() => {
    const pollInterval = setInterval(() => {
      refreshUser();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [refreshUser]);

  if (!user || user.role !== "mentor" || user.status !== "pending") {
    return null;
  }

  const createdAt = user.created_at ? new Date(user.created_at) : new Date();
  const lastReminderAt = user.last_reminder_sent_at ? new Date(user.last_reminder_sent_at) : null;

  const isCreatedDateValid = !isNaN(createdAt.getTime());
  const msSinceSignup = isCreatedDateValid ? now.getTime() - createdAt.getTime() : 0;
  const waitMs = MENTOR_APPROVAL_COOLDOWN_SECONDS * 1000;
  
  const canNotifySignup = isCreatedDateValid && (msSinceSignup >= waitMs);
  let canNotifyCooldown = true;
  let cooldownLeftMs = 0;

  if (lastReminderAt && !isNaN(lastReminderAt.getTime())) {
    const msSinceReminder = now.getTime() - lastReminderAt.getTime();
    if (msSinceReminder < waitMs) {
      canNotifyCooldown = false;
      cooldownLeftMs = waitMs - msSinceReminder;
    }
  }

  const msUntilSignupReady = waitMs - msSinceSignup;

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0 || isNaN(ms)) return "Ready";
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((ms % (1000 * 60)) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleNotify = async () => {
    setNotifying(true);
    try {
      const res = await api.post("/mentors/me/notify-admin", {});
      if (res.ok) {
        alert("Admin has been notified. You can send another reminder shortly if still pending.");
        await refreshUser();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Failed to notify admin.");
      }
    } catch (err) {
      alert("Error contacting server.");
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Brand Logo */}
      <div className="mb-8 flex items-center gap-2">
        <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={40} height={40} className="object-contain" unoptimized priority />
        <span className="font-bold text-2xl text-foreground">Coder<span className="text-primary">Corps</span></span>
      </div>

      <Card className="max-w-md w-full text-center border-border/40 shadow-xl bg-card">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Clock className="h-16 w-16 text-amber-500 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Pending Approval</CardTitle>
          <CardDescription className="text-base mt-2 text-muted-foreground">
            Your Mentorship application is under review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            An admin will review your application shortly. Once approved, you will get full access to the mentorship dashboard.
          </p>

          <div className="space-y-4">
            <div className="bg-muted/30 border border-border/40 p-4 rounded-xl text-left">
              <p className="font-semibold text-xs text-foreground uppercase tracking-wider mb-1">Submitted at:</p>
              <p className="font-mono text-sm text-foreground">
                {isCreatedDateValid ? createdAt.toLocaleString() : "Processing..."}
              </p>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex flex-col items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                If you have been waiting, you can ping the admin queue to expedite your review.
              </p>
              
              <Button 
                className="w-full mt-2" 
                disabled={!canNotifySignup || !canNotifyCooldown || notifying}
                onClick={handleNotify}
              >
                {notifying ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Notifying...</>
                ) : !canNotifySignup ? (
                  `Notify Admin (available in ${formatTimeLeft(msUntilSignupReady)})`
                ) : !canNotifyCooldown ? (
                  `Admin Notified (cooldown: ${formatTimeLeft(cooldownLeftMs)})`
                ) : (
                  "Notify Admin"
                )}
              </Button>
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
