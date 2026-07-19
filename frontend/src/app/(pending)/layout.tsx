"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Terminal } from "lucide-react";

export default function PendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if user is guest
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Route Guard: Redirect active users or incorrect roles away from waiting pages
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "mentor") {
        if (user.status === "active") {
          router.replace("/dashboard");
        } else if (user.status === "pending" && pathname !== "/mentor/pending-approval") {
          router.replace("/mentor/pending-approval");
        } else if (user.status === "rejected" && pathname !== "/mentor/rejected") {
          router.replace("/mentor/rejected");
        }
      } else {
        // Students/admins are redirected back to their dashboards
        router.replace(user.role === "student" ? "/today" : "/dashboard");
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Terminal className="h-8 w-8 text-primary animate-pulse" />
        <span className="text-sm font-mono text-muted-foreground animate-pulse">Waking up engine...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Render children only for unapproved mentors
  if (user.role === "mentor" && user.status !== "active") {
    return <>{children}</>;
  }

  return null;
}
