"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Trophy,
  Bot,
  Zap,
  CheckCircle2,
  Target,
  Share2,
  Flame,
  TrendingUp,
  Copy,
  Check,
  Compass,
  ArrowRight,
  ShieldCheck,
  Star,
  Layers,
  ChevronRight,
  RefreshCw,
  Cpu
} from "lucide-react";
import { toast } from "sonner";
import { playSuccessChime, triggerConfetti } from "@/lib/celebrate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SkillGalaxy3D } from "@/components/ui/SkillGalaxy3D";

export interface CategoryMastery {
  category: string;
  level: number;
  progress: number;
  xp: number;
}

export interface UnlockedNode {
  id: string;
  title: string;
  category: string;
  unlocked_at: string;
  xp_awarded: number;
}

export interface RecommendedNode {
  id: string;
  title: string;
  category: string;
  required_xp: number;
  description: string;
}

export interface AIMentorFeedback {
  mentor_name: string;
  mentor_title: string;
  weekly_headline: string;
  strengths: string[];
  growth_areas: string[];
  suggested_focus: string;
}

export interface WeeklyDigestData {
  period_start: string;
  period_end: string;
  weekly_xp_gained: number;
  total_xp: number;
  weekly_tasks_completed: number;
  weekly_prs_merged: number;
  active_streak_days: number;
  velocity_score: number;
  category_mastery: {
    category: string;
    level: number;
    progress: number;
    xp: number;
  }[];
  unlocked_nodes: UnlockedNode[];
  next_recommended_nodes: RecommendedNode[];
  ai_mentor_feedback: AIMentorFeedback;
  committed_target_node_id?: string;
}

export function WeeklySkillDigestCard({ userName }: { userName?: string }) {
  const [data, setData] = useState<WeeklyDigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [committedNodeId, setCommittedNodeId] = useState<string>("websockets");
  const [committing, setCommitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [galaxyModalOpen, setGalaxyModalOpen] = useState(false);

  const fetchDigest = async () => {
    try {
      setLoading(true);
      const res = await api.get("/daily/weekly-digest");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.committed_target_node_id) {
          setCommittedNodeId(json.committed_target_node_id);
        }
      }
    } catch (err) {
      console.error("Failed to load weekly skill digest", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest();
  }, []);

  const handleCommitGoal = async (nodeId: string) => {
    setCommitting(true);
    try {
      const res = await api.post("/daily/weekly-digest/commit-goal", { node_id: nodeId });
      if (res.ok) {
        setCommittedNodeId(nodeId);
        playSuccessChime();
        triggerConfetti();
        const selected = data?.next_recommended_nodes.find((n) => n.id === nodeId);
        toast.success(
          `Target Locked! 🎯 "${selected?.title || nodeId}" committed for next sprint!`
        );
      } else {
        toast.error("Failed to save target goal");
      }
    } catch {
      toast.error("Connection error while committing goal");
    } finally {
      setCommitting(false);
    }
  };

  const handleCopyDigest = () => {
    if (!data) return;
    const reportText = `🏆 CoderCorps Weekly Skill Digest (${data.period_start} - ${data.period_end})
👤 Developer: ${userName || "Student"}
⚡ Weekly XP Gained: +${data.weekly_xp_gained} XP | Total: ${data.total_xp} XP
🔥 Standup Streak: ${data.active_streak_days} Days | Velocity Score: ${data.velocity_score}/100
✅ Tasks Completed: ${data.weekly_tasks_completed} | PRs Merged: ${data.weekly_prs_merged}

🌟 Unlocked Constellation Nodes:
${data.unlocked_nodes.map((n) => `• ${n.title} (${n.category}) - +${n.xp_awarded} XP`).join("\n")}

🤖 AI Mentor Feedback (${data.ai_mentor_feedback.mentor_name} - ${data.ai_mentor_feedback.mentor_title}):
"${data.ai_mentor_feedback.weekly_headline}"
Suggested Next Sprint Focus: ${data.ai_mentor_feedback.suggested_focus}

🎯 Next Sprint Target: ${data.next_recommended_nodes.find((n) => n.id === committedNodeId)?.title || committedNodeId}`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    playSuccessChime();
    toast.success("Weekly Skill Digest copied to clipboard! 📋");
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading && !data) {
    return (
      <Card className="glass-premium border-indigo-500/20 p-8 rounded-3xl animate-pulse space-y-4">
        <div className="h-6 w-48 bg-indigo-500/10 rounded-full" />
        <div className="h-10 w-3/4 bg-card rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="h-20 bg-card/60 rounded-2xl" />
          <div className="h-20 bg-card/60 rounded-2xl" />
          <div className="h-20 bg-card/60 rounded-2xl" />
          <div className="h-20 bg-card/60 rounded-2xl" />
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const committedNode = data.next_recommended_nodes.find((n) => n.id === committedNodeId);

  return (
    <Card className="glass-premium border-indigo-500/30 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Background ambient cosmic glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cyan-500/15 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header bar */}
      <CardHeader className="pb-4 relative z-10 border-b border-border/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-indigo-400 border border-indigo-500/30 font-mono tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                <Sparkles className="h-3 w-3 text-indigo-400 animate-spin" style={{ animationDuration: "6s" }} />
                WEEKLY SKILL TREE DIGEST
              </span>
              <span className="text-[11px] font-mono text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-md">
                {data.period_start} – {data.period_end}
              </span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
              <Trophy className="h-6 w-6 text-amber-400 shrink-0" />
              <span>Skill Galaxy Progress & AI Mentor Review</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Weekly synthesis of your code commits, unlocked star nodes, and architectural growth.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyDigest}
              className="gap-2 rounded-xl text-xs font-bold border-border/60 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-indigo-400" />}
              {copied ? "Copied!" : "Share Digest"}
            </Button>

            <Dialog open={galaxyModalOpen} onOpenChange={setGalaxyModalOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="gap-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Compass className="h-3.5 w-3.5" />
                  View 3D Star Map
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-premium border-indigo-500/40 max-w-5xl h-[85vh] p-4 flex flex-col rounded-3xl">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                    Interactive 3D Skill Galaxy Constellation
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 w-full h-full rounded-2xl overflow-hidden border border-border/40 relative">
                  <SkillGalaxy3D />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6 relative z-10">
        {/* Metric Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-1 relative overflow-hidden group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between text-xs font-mono text-indigo-400">
              <span className="uppercase tracking-wider font-semibold">Weekly XP</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              +{data.weekly_xp_gained}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Total: {data.total_xp} XP (Top 5%)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 space-y-1 relative overflow-hidden group hover:border-cyan-500/50 transition-all">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
              <span className="uppercase tracking-wider font-semibold">Sprint Tasks</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {data.weekly_tasks_completed}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {data.weekly_prs_merged} PRs merged to main
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1 relative overflow-hidden group hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between text-xs font-mono text-amber-400">
              <span className="uppercase tracking-wider font-semibold">Streak</span>
              <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {data.active_streak_days} <span className="text-sm font-semibold">Days</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Unbroken Daily Standups
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
              <span className="uppercase tracking-wider font-semibold">Velocity Score</span>
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {data.velocity_score}<span className="text-xs text-muted-foreground">/100</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono font-bold">
              High Sprint Momentum
            </div>
          </div>
        </div>

        {/* Constellation Nodes Unlocked This Week */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black tracking-wider uppercase text-muted-foreground font-mono flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              Constellation Nodes Unlocked This Week ({data.unlocked_nodes.length})
            </h3>
            <span className="text-[11px] font-mono text-indigo-400">
              +{data.unlocked_nodes.reduce((acc, curr) => acc + curr.xp_awarded, 0)} XP Earned
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.unlocked_nodes.map((node) => {
              let badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
              if (node.category === "Frontend") badgeColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
              else if (node.category === "DevOps") badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";

              return (
                <div
                  key={node.id}
                  className="p-3.5 rounded-2xl bg-card/40 border border-border/50 hover:border-indigo-500/40 hover:bg-card/70 transition-all flex flex-col justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-extrabold uppercase font-mono px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {node.category}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{node.unlocked_at}</span>
                    </div>
                    <div className="text-sm font-bold text-foreground leading-snug">
                      {node.title}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs font-mono">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Unlocked
                    </span>
                    <span className="text-indigo-400 font-bold">+{node.xp_awarded} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Mastery Progress Bars */}
        <div className="space-y-3">
          <h3 className="text-xs font-black tracking-wider uppercase text-muted-foreground font-mono flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            Engineering Domain Mastery Progression
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.category_mastery.map((cat) => (
              <div key={cat.category} className="p-3.5 rounded-2xl bg-card/30 border border-border/40 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{cat.category}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground uppercase">
                      Lvl {cat.level}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {cat.progress}% ({cat.xp} XP)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700"
                    style={{ width: `${cat.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Mentor Feedback Synthesis Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-card/50 to-purple-950/30 border border-indigo-500/30 space-y-4 shadow-inner">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-foreground">{data.ai_mentor_feedback.mentor_name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold uppercase">
                    {data.ai_mentor_feedback.mentor_title}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Weekly Automated Architectural Review
                </p>
              </div>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-indigo-500/40 text-indigo-400 bg-indigo-500/10 text-[10px] font-mono font-bold shadow-sm">
              <ShieldCheck className="h-3 w-3 mr-1 text-emerald-400" /> Verified AI Synthesis
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-background/50 border border-indigo-500/20">
            <p className="text-xs sm:text-sm font-bold text-foreground italic leading-relaxed">
              &ldquo;{data.ai_mentor_feedback.weekly_headline}&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Key Architectural Strengths
              </div>
              <ul className="space-y-2">
                {data.ai_mentor_feedback.strengths.map((str, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth Areas */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> Next Level Opportunities
              </div>
              <ul className="space-y-2">
                {data.ai_mentor_feedback.growth_areas.map((area, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-amber-400 font-bold mt-0.5">•</span>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Suggested Sprint Focus */}
          <div className="pt-2 border-t border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground font-medium">
              <span className="font-bold text-foreground">💡 Mentor Recommendation:</span> {data.ai_mentor_feedback.suggested_focus}
            </span>
          </div>
        </div>

        {/* Next Sprint Target Commitment Selector */}
        <div className="p-5 rounded-2xl bg-card/40 border border-border/50 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black tracking-wider uppercase text-foreground font-mono flex items-center gap-1.5">
                <Target className="h-4 w-4 text-pink-500" />
                Commit to Next Sprint Constellation Target
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Lock in your focus node for the upcoming week to steer sprint task generation and PR evaluation.
              </p>
            </div>
            {committedNode && (
              <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                <Check className="h-3.5 w-3.5" /> Locked: {committedNode.title}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.next_recommended_nodes.map((rec) => {
              const isSelected = committedNodeId === rec.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => handleCommitGoal(rec.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent border-indigo-500 shadow-md shadow-indigo-500/10 scale-[1.02]"
                      : "bg-background/40 hover:bg-background/80 border-border/50 hover:border-border"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                        {rec.category}
                      </span>
                      <span className="text-[10px] font-mono text-indigo-400 font-bold">
                        {rec.required_xp} XP Req
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {rec.title}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {rec.description}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    disabled={committing}
                    variant={isSelected ? "default" : "outline"}
                    className={`w-full rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                        : "border-border/60 hover:bg-indigo-500/10"
                    }`}
                  >
                    {isSelected ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" /> Target Locked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Commit Target <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
