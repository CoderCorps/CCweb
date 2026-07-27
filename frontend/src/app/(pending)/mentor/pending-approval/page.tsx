"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Clock, Bell, Loader2, LogOut, FolderGit2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAssetUrl } from "@/lib/utils";
import { MENTOR_APPROVAL_COOLDOWN_SECONDS } from "@/lib/constants";

export default function PendingApprovalPage() {
  const { user, logout, refreshUser } = useAuth();
  const [now, setNow] = useState(new Date());
  const [notifying, setNotifying] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/projects");
        if (res.ok) {
          const data = await res.json();
          // Filter to projects managed by this mentor
          setProjects(data.filter((p: any) => p.mentor_id === user?.id));
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
      }
    };
    if (user) {
      fetchProjects();
    }
  }, [user]);

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

  if (!user || user.status !== "pending") {
    return null;
  }

  const parseUTCDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
    return isNaN(date.getTime()) ? new Date(dateStr) : date;
  };

  const createdAt = parseUTCDate(user.created_at) || new Date();
  const lastReminderAt = parseUTCDate(user.last_reminder_sent_at);

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
          <CardTitle className="text-2xl font-bold tracking-tight">Pending Admin Approval</CardTitle>
          <CardDescription className="text-base mt-2 text-muted-foreground">
            {user.role === "mentor" ? "Your Mentorship application is under review" : "Your Student Account & Assessment results are under review"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {user.role === "mentor" 
              ? "An admin will review your application shortly. Once approved, you will get full access to the mentorship dashboard."
              : "An admin is reviewing your assessment results and profile. Once approved, you will get full access to your student workspace and projects!"}
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

      {projects.length > 0 && (
        <Card className="max-w-md w-full mt-6 border-border/40 shadow-xl bg-card">
          <CardHeader className="pb-3 text-left">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-primary" />
              Projects Under Review
            </CardTitle>
            <CardDescription>
              Discuss project approval details with administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {projects.map((proj) => (
              <div key={proj.id} className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/40 rounded-xl">
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">{proj.title}</p>
                  <p className="text-[10px] font-mono text-amber-500 uppercase tracking-wider mt-0.5">
                    {proj.status.replace('_', ' ')}
                  </p>
                </div>
                <Link href={`/projects/${proj.id}/approval-thread`}>
                  <Button size="sm" variant="outline" className="gap-1.5 border-primary/20 text-primary hover:bg-primary/5">
                    Discuss <MessageSquare className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
