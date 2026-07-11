"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Filter, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronDown
} from "lucide-react";
import Image from "next/image";
import { ReactionBar } from "@/components/reactions/reaction-bar";

interface Project {
  id: number;
  title: string;
}

interface MissingStudent {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  project_title: string;
}

interface DailyTodo {
  id: number;
  description: string;
  status: string;
  source: string;
}

interface DailyReport {
  id: number;
  user_id: number;
  user_name: string;
  project_id: number;
  project_title?: string;
  date: string;
  summary: string;
  blockers: string | null;
  links: string[];
  hours_spent: number | null;
  mentor_id: number | null;
  submitted_at: string;
  mentor_feedback: string | null;
  mentor_read_at: string | null;
  todos: DailyTodo[];
}

export default function MentorReportsPage() {
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [missingStudents, setMissingStudents] = useState<MissingStudent[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  // Feedbacks state: report_id -> text content
  const [feedbackTexts, setFeedbackTexts] = useState<Record<number, string>>({});
  const [savingFeedbackId, setSavingFeedbackId] = useState<number | null>(null);

  const fetchReportsAndMissing = useCallback(async () => {
    if (!user) return;
    try {
      const todayStr = new Date().toISOString().split("T")[0];

      // 1. Fetch mentor's projects
      const projRes = await api.get("/projects");
      if (!projRes.ok) return;
      const projData = await projRes.json();
      setProjects(projData);

      // 2. Fetch missing students across projects
      const missingList: MissingStudent[] = [];
      for (const p of projData) {
        const missRes = await api.get(`/daily/reports/missing?project_id=${p.id}&date=${todayStr}`);
        if (missRes.ok) {
          const missData = await missRes.json();
          missData.forEach((student: any) => {
            missingList.push({
              ...student,
              project_title: p.title
            });
          });
        }
      }
      setMissingStudents(missingList);

      // 3. Fetch daily reports
      let url = `/daily/reports?date_from=${dateFrom}&date_to=${dateTo}`;
      if (selectedProjectId !== "all") {
        url += `&project_id=${selectedProjectId}`;
      }

      const repRes = await api.get(url);
      if (repRes.ok) {
        const repData = await repRes.json();
        
        // Map project title to reports
        const mappedReports = repData.map((rep: any) => {
          const matchedProj = projData.find((p: any) => p.id === rep.project_id);
          return {
            ...rep,
            project_title: matchedProj ? matchedProj.title : "Workspace Project"
          };
        });

        setReports(mappedReports);

        // Prepopulate feedback inputs
        const initialFeedbacks: Record<number, string> = {};
        mappedReports.forEach((r: DailyReport) => {
          initialFeedbacks[r.id] = r.mentor_feedback || "";
        });
        setFeedbackTexts(initialFeedbacks);
      }
    } catch (err) {
      console.error("Failed to load mentor reports data", err);
    } finally {
      setLoading(false);
    }
  }, [user, dateFrom, dateTo, selectedProjectId]);

  useEffect(() => {
    fetchReportsAndMissing();
  }, [fetchReportsAndMissing]);

  const handleFeedbackChange = (reportId: number, val: string) => {
    setFeedbackTexts((prev) => ({ ...prev, [reportId]: val }));
  };

  const handleSaveFeedback = async (reportId: number) => {
    const feedback = feedbackTexts[reportId] || "";
    setSavingFeedbackId(reportId);

    try {
      const res = await api.patch(`/daily/reports/${reportId}/feedback`, {
        feedback: feedback.trim()
      });
      if (res.ok) {
        alert("Feedback updated successfully!");
        fetchReportsAndMissing();
      } else {
        alert("Failed to save feedback");
      }
    } catch (err) {
      alert("Error updating feedback");
    } finally {
      setSavingFeedbackId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-card rounded-xl" />
        <div className="h-[400px] bg-card rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-400" /> Daily Standup Audit Feed
        </h1>
        <p className="text-xs text-muted-foreground">Monitor daily student checklists, blocker logs, and send review replies.</p>
      </div>

      {/* Missing Today Panel */}
      {missingStudents.length > 0 && (
        <Card className="glass border-amber-500/20 bg-amber-500/5">
          <CardHeader className="py-4">
            <CardTitle className="text-amber-400 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Missing Reports Today ({missingStudents.length})
            </CardTitle>
            <CardDescription className="text-[11px] text-amber-500/70">
              Students who haven't started their checklist or logged standup reports today.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-3">
              {missingStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-amber-500/10 text-xs text-white">
                  <div className="h-5 w-5 rounded-full bg-amber-600/30 border border-amber-500/20 flex items-center justify-center text-[8px] font-bold text-amber-300 overflow-hidden shrink-0">
                    {s.avatar_url ? (
                      <Image src={s.avatar_url} alt={s.name} width={20} height={20} className="object-cover" />
                    ) : (
                      getInitials(s.name)
                    )}
                  </div>
                  <div>
                    <span className="font-bold">{s.name}</span>
                    <span className="text-[9px] text-amber-400/70 font-mono uppercase ml-1">({s.project_title})</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters bar */}
      <div className="glass p-4 rounded-xl border-border/40 flex flex-wrap gap-4 items-end bg-card/10">
        
        {/* Project select */}
        <div className="space-y-1 w-full sm:w-56">
          <label htmlFor="filter_proj" className="text-[10px] font-bold text-slate-300 font-mono flex items-center gap-1">
            <Filter className="h-3 w-3 text-indigo-400" /> PROJECT STREAM
          </label>
          <select
            id="filter_proj"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 py-0.5 text-xs shadow-sm text-foreground"
          >
            <option value="all" className="bg-card">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-card">{p.title}</option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="space-y-1 w-full sm:w-36">
          <label htmlFor="date_from" className="text-[10px] font-bold text-slate-300 font-mono uppercase">Date From</label>
          <Input
            id="date_from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-xs bg-black/20 border-border/60"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1 w-full sm:w-36">
          <label htmlFor="date_to" className="text-[10px] font-bold text-slate-300 font-mono uppercase">Date To</label>
          <Input
            id="date_to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs bg-black/20 border-border/60"
          />
        </div>

        <Button onClick={fetchReportsAndMissing} className="h-8 text-xs font-semibold px-4 w-full sm:w-auto mt-1 sm:mt-0">
          Apply Filters
        </Button>

      </div>

      {/* Reports Feed */}
      <div className="space-y-6">
        {reports.length > 0 ? (
          reports.map((report) => {
            const isUnread = report.mentor_read_at === null;
            return (
              <Card 
                key={report.id} 
                className={`glass border-border/40 overflow-hidden transition-all duration-200 ${
                  isUnread ? "border-l-4 border-l-indigo-500 shadow-indigo-500/5 shadow-md" : ""
                }`}
              >
                {/* Card Header */}
                <div className="p-4 bg-card/20 border-b border-border/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-600/30 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300 overflow-hidden shrink-0">
                      {getInitials(report.user_name)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                        {report.user_name}
                        {isUnread && (
                          <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">NEW</span>
                        )}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{report.project_title}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-300 font-mono block">DATE: {new Date(report.date).toLocaleDateString()}</span>
                    <span className="text-[9px] text-muted-foreground font-mono block mt-0.5">SUBMITTED: {new Date(report.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Card Content */}
                <CardContent className="p-5 space-y-4 font-sans text-xs">
                  
                  {/* Hours Spent & Blockers Row */}
                  <div className="flex flex-wrap gap-4">
                    {report.hours_spent !== null && (
                      <div className="flex items-center gap-1 bg-card/60 px-3 py-1 rounded border border-border/40">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-slate-300">Time logged: <strong>{report.hours_spent} hours</strong></span>
                      </div>
                    )}
                    {report.blockers && (
                      <div className="flex items-center gap-1 bg-red-500/10 text-red-400 px-3 py-1 rounded border border-red-500/20">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Blockers: <strong>{report.blockers}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Summary Text Box */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Summary & Details:</span>
                    <pre className="p-3 bg-black/25 rounded-xl border border-border/30 text-[11px] text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                      {report.summary}
                    </pre>
                    <ReactionBar targetType="report" targetId={report.id} />
                  </div>

                  {/* Checklist items snapshot */}
                  {report.todos.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Checklist Items:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {report.todos.map((todo) => {
                          const isDone = todo.status === "done";
                          const isInProgress = todo.status === "in_progress";
                          return (
                            <div key={todo.id} className="flex items-center gap-2 p-2 rounded bg-card/40 border border-border/20">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${
                                isDone ? "bg-emerald-400" : isInProgress ? "bg-cyan-400" : "bg-slate-500"
                              }`} />
                              <span className={`text-[11px] truncate ${isDone ? "text-slate-400 line-through" : "text-white"}`}>{todo.description}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Relevant Links */}
                  {report.links.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Relevant Links:</span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {report.links.map((lnk, idx) => (
                          <a 
                            key={idx} 
                            href={lnk} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 text-[10px] transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Link #{idx + 1}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback reply editor */}
                  <div className="border-t border-border/20 pt-4 space-y-3 bg-card/20 p-4 rounded-xl">
                    <label htmlFor={`fb_${report.id}`} className="text-[10px] font-bold text-slate-300 font-mono flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4 text-indigo-400" /> FEEDBACK REPLY
                    </label>
                    <textarea
                      id={`fb_${report.id}`}
                      rows={2}
                      value={feedbackTexts[report.id] || ""}
                      onChange={(e) => handleFeedbackChange(report.id, e.target.value)}
                      placeholder="Leave review notes or request details..."
                      className="flex w-full rounded-md border border-input bg-black/25 px-3 py-2 text-xs shadow-sm"
                    />
                    <div className="flex justify-between items-center">
                      {report.mentor_feedback && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Feedback sent
                        </span>
                      )}
                      <Button
                        onClick={() => handleSaveFeedback(report.id)}
                        disabled={savingFeedbackId === report.id || (feedbackTexts[report.id] || "") === (report.mentor_feedback || "")}
                        size="sm"
                        className="ml-auto text-xs font-bold"
                      >
                        {savingFeedbackId === report.id ? "Saving..." : "Save Feedback"}
                      </Button>
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="glass p-12 text-center border-border/40 text-muted-foreground flex flex-col items-center gap-3">
            <FileText className="h-8 w-8 text-border animate-pulse" />
            <div>
              <h3 className="font-bold text-white text-md">No Reports Logged</h3>
              <p className="text-xs">No daily reports match the filter parameters.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
