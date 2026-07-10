"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  ExternalLink, 
  AlertCircle, 
  Terminal,
  Calendar,
  Layers,
  CheckCircle2,
  Bookmark
} from "lucide-react";

interface Student {
  id: number;
  name: string;
  email: string;
  college: string;
  avatar_url: string | null;
  project_title: string;
  sprint_number: number;
  tasks_in_progress: number;
  last_activity_date: string;
  portfolio_slug: string;
}

export default function MentorStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudents() {
      if (!user) return;
      try {
        const res = await api.get(`/mentors/${user.id}/students`);
        if (res.ok) {
          const data = await res.json();
          setStudents(data);
        } else {
          setError("Failed to fetch assigned students roster.");
        }
      } catch (err) {
        setError("Error contacting the API server.");
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center flex-col gap-4">
        <Terminal className="h-8 w-8 text-primary animate-pulse" />
        <span className="text-sm font-mono text-muted-foreground animate-pulse">Assembling developer records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-6 border-red-500/20 text-center flex flex-col items-center gap-3">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <h3 className="text-lg font-bold text-foreground">Error Loading Students</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-border/40 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Enrolled Students</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview of developers assigned to active projects under your engineering mentorship.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-semibold font-mono w-fit">
          <Users className="h-4 w-4" />
          <span>ROSTER: {students.length} DEVELOPERS</span>
        </div>
      </div>

      <Card className="glass border-border/40">
        <CardContent className="pt-6">
          {students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/40 font-mono text-[11px] text-muted-foreground uppercase">
                    <th className="pb-3 font-semibold">Student Name</th>
                    <th className="pb-3 font-semibold">Current Project</th>
                    <th className="pb-3 font-semibold">Current Sprint</th>
                    <th className="pb-3 text-center font-semibold">Tasks In Progress</th>
                    <th className="pb-3 font-semibold">Last Activity</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-sans">
                  {students.map((student) => {
                    const publicPortfolioUrl = `/portfolio/${student.portfolio_slug}`;
                    return (
                      <tr key={student.id} className="align-middle hover:bg-card/25 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <Image
                              src={student.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.name)}`}
                              alt={student.name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover border border-border"
                            />
                            <div>
                              <p className="font-bold text-foreground leading-none">{student.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-1">{student.college || "No College Listed"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="font-semibold text-foreground">{student.project_title}</span>
                        </td>
                        <td className="py-4 font-mono text-xs">
                          <div className="flex items-center gap-1.5 text-indigo-400">
                            <Layers className="h-3.5 w-3.5" />
                            <span>Sprint {student.sprint_number}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center font-mono text-xs">
                          {student.tasks_in_progress > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                              {student.tasks_in_progress} Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center gap-1 w-fit mx-auto">
                              <CheckCircle2 className="h-3 w-3" /> Done
                            </span>
                          )}
                        </td>
                        <td className="py-4 font-mono text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{new Date(student.last_activity_date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <a href={publicPortfolioUrl} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary hover:bg-primary/10 gap-1">
                              <ExternalLink className="h-3.5 w-3.5" /> Portfolio
                            </Button>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <Bookmark className="h-10 w-10 text-muted-foreground/60 mx-auto animate-pulse" />
              <div>
                <p className="text-sm font-bold text-foreground">No students enrolled</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You are not currently mentoring any active project teams.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
