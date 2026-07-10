"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  ExternalLink
} from "lucide-react";

interface DailyTodo {
  id: number;
  description: string;
  status: string;
}

interface Mentor {
  id: number;
  name: string;
}

interface Project {
  id: number;
  title: string;
  mentor?: Mentor;
}

interface DailyReportFormProps {
  todos: DailyTodo[];
  projectId: number;
  onSuccess: () => void;
}

export default function DailyReportForm({ todos, projectId, onSuccess }: DailyReportFormProps) {
  const [project, setProject] = useState<Project | null>(null);
  
  // Form fields
  const [summary, setSummary] = useState("");
  const [blockers, setBlockers] = useState("");
  const [hoursSpent, setHoursSpent] = useState<number | "">("");
  const [links, setLinks] = useState<string[]>([""]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Pre-fill summary from today's checklist on mount & fetch project mentor
  useEffect(() => {
    async function loadProjectInfo() {
      try {
        const res = await api.get(`/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (err) {
        console.error("Failed to load project details", err);
      } finally {
        setLoading(false);
      }
    }

    // Generate pre-filled summary text
    let prepopulated = "Today's Checklist:\n";
    todos.forEach((t) => {
      let statusStr = "Planned";
      if (t.status === "in_progress") statusStr = "In Progress";
      else if (t.status === "done") statusStr = "Completed";
      
      prepopulated += `- [${statusStr}] ${t.description}\n`;
    });
    setSummary(prepopulated);

    loadProjectInfo();
  }, [projectId, todos]);

  const handleAddLink = () => {
    setLinks((prev) => [...prev, ""]);
  };

  const handleLinkChange = (index: number, val: string) => {
    setLinks((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleRemoveLink = (index: number) => {
    setLinks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const todayStr = new Date().toISOString().split("T")[0];
    const filteredLinks = links.filter((lnk) => lnk.trim() !== "");

    try {
      const res = await api.post("/daily/reports", {
        project_id: projectId,
        date: todayStr,
        summary: summary.trim(),
        blockers: blockers.trim() || null,
        links: filteredLinks,
        hours_spent: hoursSpent !== "" ? Number(hoursSpent) : null
      });

      if (res.ok) {
        setSubmitSuccess(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || "Failed to submit report. Have you already submitted one today?");
      }
    } catch (err) {
      setError("Failed to transmit report payload");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-6 bg-card rounded w-1/3" />
        <div className="h-32 bg-card rounded" />
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="text-center p-6 space-y-4 flex flex-col items-center animate-in zoom-in duration-200">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Daily Report Submitted!</h3>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
            Your report was successfully transmitted to Mentor{" "}
            <span className="text-indigo-400 font-semibold">{project?.mentor?.name || "Unassigned"}</span>.
          </p>
        </div>
        <Button onClick={onSuccess} className="w-32 mt-2">
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-2 text-sans">
      <div className="space-y-1">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-400" /> Daily Standup Report
        </h2>
        <p className="text-xs text-slate-400">
          Summarize what you accomplished today and report any roadblock blockers.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary of work */}
      <div className="space-y-1.5">
        <label htmlFor="summary" className="text-[10px] font-bold text-slate-300 font-mono">1. SUMMARY OF WORK DONE (EDITABLE)</label>
        <textarea
          id="summary"
          required
          rows={5}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="flex w-full rounded-md border border-input bg-black/20 px-3 py-2 text-xs shadow-sm"
        />
      </div>

      {/* Blockers */}
      <div className="space-y-1.5">
        <label htmlFor="blockers" className="text-[10px] font-bold text-slate-300 font-mono">2. BLOCKERS & IMPEDIMENTS (OPTIONAL)</label>
        <textarea
          id="blockers"
          rows={2}
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          placeholder="None"
          className="flex w-full rounded-md border border-input bg-black/20 px-3 py-2 text-xs shadow-sm"
        />
      </div>

      {/* Hours and links grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Hours Spent */}
        <div className="space-y-1.5 md:col-span-1">
          <label htmlFor="hours" className="text-[10px] font-bold text-slate-300 font-mono flex items-center gap-1">
            <Clock className="h-3 w-3 text-indigo-400" /> HOURS WORKED
          </label>
          <Input
            id="hours"
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={hoursSpent}
            onChange={(e) => setHoursSpent(e.target.value !== "" ? Number(e.target.value) : "")}
            placeholder="e.g. 4.5"
            className="h-8 text-xs bg-black/20 border-border/60"
          />
        </div>

        {/* Deliverable URLs */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[10px] font-bold text-slate-300 font-mono flex items-center gap-1">
            <ExternalLink className="h-3 w-3 text-indigo-400" /> RELEVANT LINKS (PRS, PULL REQUESTS, DEMOS)
          </label>
          <div className="space-y-2">
            {links.map((link, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  type="url"
                  value={link}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                  placeholder="https://github.com/..."
                  className="h-8 text-xs bg-black/20 border-border/60 flex-1"
                />
                {links.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                    onClick={() => handleRemoveLink(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLink}
              className="h-7 text-[10px] font-bold gap-1 mt-1 border border-border"
            >
              <Plus className="h-3.5 w-3.5" /> Add Link
            </Button>
          </div>
        </div>

      </div>

      <div className="pt-2 flex gap-3 justify-end">
        <Button type="submit" disabled={submitting} className="w-full font-bold h-10">
          {submitting ? "Transmitting Report..." : "Send Daily Standup"}
        </Button>
      </div>
    </form>
  );
}
