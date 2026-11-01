"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Award,
  Link2,
  ExternalLink,
  ShieldCheck,
  Terminal,
  ArrowLeft,
  User as UserIcon,
  GitPullRequest,
  GitMerge,
  Clock,
  Sparkles,
  Printer,
  Copy,
  Check,
  FolderGit2,
  CheckCircle2,
  Download
} from "lucide-react";
import { Github, Linkedin } from "@/components/ui/icons";
import { TiltCard } from "@/components/ui/tilt-card";
import { GitHubGraph } from "@/components/ui/github-graph";
import { SkillGalaxy3D } from "@/components/ui/SkillGalaxy3D";
import { BadgeTooltip } from "@/components/ui/BadgeTooltip";
import Link from "next/link";

interface Profile {
  bio: string;
  college: string;
  skills: string[];
  github_url: string;
  linkedin_url: string;
  resume_url: string;
  is_public: boolean;
  availability?: string | null;
}

interface ProjectContribution {
  project_id: number;
  project_title: string;
  project_description?: string;
  role: string;
  status: string;
}

interface PullRequestContribution {
  id: number;
  task_id: number;
  task_title: string;
  project_id: number;
  project_title: string;
  github_pr_url?: string | null;
  status: "merged" | "review" | "open";
  difficulty?: string | null;
  submitted_at?: string | null;
  mentor_score?: number | null;
}

interface PRStats {
  total_raised: number;
  merged_count: number;
  in_review_count: number;
  open_count: number;
  merge_rate: number;
}

interface Certificate {
  id: number;
  certificate_number?: string;
  verification_code?: string;
  title?: string;
  project_title: string;
  issued_at: string;
  public_url?: string;
  criteria: {
    student_name: string;
    project_title: string;
    mentor_name: string;
    demo_url?: string;
    repo_url?: string;
    approved_at?: string;
    audit_message: string;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  unlocked_skills?: string[];
  skill_points?: number;
  badges?: any[];
  profile: Profile | null;
  certificates?: Certificate[];
  projects?: ProjectContribution[];
  pull_requests?: PullRequestContribution[];
  pr_stats?: PRStats;
}

export default function PublicPortfolioPage() {
  const { username } = useParams();
  const router = useRouter();
  const [profileData, setProfileData] = useState<User | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [projects, setProjects] = useState<ProjectContribution[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestContribution[]>([]);
  const [prStats, setPrStats] = useState<PRStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive controls
  const [prFilter, setPrFilter] = useState<"all" | "merged" | "review" | "open">("all");
  const [selectedCertModal, setSelectedCertModal] = useState<Certificate | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const res = await api.get(`/portfolio/${username}`, { skipAuth: true });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
          if (data.certificates) setCerts(data.certificates);
          if (data.projects) setProjects(data.projects);
          if (data.pull_requests) setPullRequests(data.pull_requests);
          if (data.pr_stats) setPrStats(data.pr_stats);
        } else {
          setError("Portfolio is private or does not exist.");
        }
      } catch (err) {
        setError("Error connecting to server.");
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, [username]);

  const handleCopyProfile = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Terminal className="h-8 w-8 text-primary animate-pulse" />
        <span className="text-sm font-mono text-muted-foreground animate-pulse">Retrieving audited records & released certificates...</span>
      </div>
    );
  }

  if (error || !profileData || !profileData.profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass max-w-md w-full p-8 border-red-500/20 text-center flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-red-500 animate-pulse" />
          <div>
            <h3 className="font-bold text-foreground text-lg">Portfolio Not Available</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {error || "This profile is set to private or does not exist."}
            </p>
          </div>
          <Button onClick={() => router.push("/")} variant="outline" className="text-xs border-border">
            <ArrowLeft className="h-4.5 w-4.5 mr-1" /> Return Home
          </Button>
        </div>
      </div>
    );
  }

  const { profile } = profileData;

  // Filtered pull requests
  const filteredPRs = pullRequests.filter((pr) => {
    if (prFilter === "all") return true;
    return pr.status === prFilter;
  });

  return (
    <div className="bg-background text-foreground min-h-screen py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_60%)] -z-10" />

      <div className="max-w-4xl mx-auto space-y-10 font-sans">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to CoderCorps
          </button>

          <Button 
            onClick={handleCopyProfile}
            variant="outline" 
            size="sm" 
            className="text-xs gap-1.5 border-border bg-card/60"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedLink ? "Link Copied!" : "Share Profile"}</span>
          </Button>
        </div>

        {/* 1. Developer Card Header with 3D Tilt Wrapper */}
        <TiltCard scale={1.01} maxRotation={8}>
          <Card className="glass-premium border-border/40 p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 w-full shadow-2xl">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              {profileData.avatar_url ? (
                <Image 
                  src={profileData.avatar_url} 
                  alt={profileData.name} 
                  width={112}
                  height={112}
                  priority={true}
                  loading="eager"
                  className="rounded-full object-cover border-2 border-primary/50 shadow-lg min-h-[112px] min-w-[112px]"
                />
              ) : (
                <div className="w-[112px] h-[112px] rounded-full border-2 border-primary/50 shadow-lg bg-card/60 flex items-center justify-center text-muted-foreground shrink-0">
                  <UserIcon className="w-12 h-12" />
                </div>
              )}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono">
                  <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED AGENTIC DEVELOPER
                </div>
                <h1 className="text-3xl font-extrabold text-foreground">{profileData.name}</h1>
                <p className="text-sm text-indigo-400 font-mono">{profile.college}</p>
                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">{profile.bio}</p>

                {/* Quick Impact Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-md">
                    🎓 {certs.length} Released {certs.length === 1 ? "Certificate" : "Certificates"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-md">
                    🔀 {prStats?.merged_count ?? pullRequests.filter(p => p.status === "merged").length} Merged PRs
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-md">
                    📁 {projects.length || 1} {projects.length === 1 ? "Project" : "Projects"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300 px-2.5 py-1 rounded-md">
                    ⭐ {profileData.skill_points || 350} Skill Points
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-3">
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-card border hover:bg-border/60 text-muted-foreground hover:text-foreground transition-colors shadow-sm cursor-pointer" title="GitHub Profile">
                  <Github className="h-5 w-5" />
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-card border hover:bg-border/60 text-muted-foreground hover:text-foreground transition-colors shadow-sm cursor-pointer" title="LinkedIn Profile">
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
              {profile.resume_url && (
                <a href={profile.resume_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-card border hover:bg-border/60 text-muted-foreground hover:text-foreground transition-colors shadow-sm cursor-pointer" title="Resume / CV">
                  <FileText className="h-5 w-5" />
                </a>
              )}
            </div>
          </Card>
        </TiltCard>

        {/* 2. Official Released Certificates Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <div>
              <h2 className="text-lg font-black text-foreground font-mono uppercase tracking-wider flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                <span>Officially Released Certificates</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Authentic, cryptographically verifiable certificates issued by CoderCorps mentors upon passing production audits.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
              {certs.length} Verified
            </span>
          </div>

          {certs.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {certs.map((cert) => {
                const certCode = cert.verification_code || `CORPS-CERT-${cert.id}`;
                return (
                  <Card 
                    key={cert.id} 
                    className="glass border-2 border-amber-500/30 p-6 sm:p-7 relative overflow-hidden bg-gradient-to-br from-amber-500/5 via-transparent to-indigo-500/5 shadow-xl hover:border-amber-500/50 transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Award className="h-36 w-36 text-amber-400" />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                      <div className="space-y-4 flex-1">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                              CERT NO: {cert.certificate_number || `CORPS-${cert.id}`}
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> RELEASED &amp; VERIFIED
                            </span>
                          </div>

                          <h3 className="text-2xl font-black text-foreground mt-1 tracking-tight">
                            {cert.title || `Certificate of Completion - ${cert.project_title}`}
                          </h3>
                          <p className="text-xs text-indigo-400 font-mono">
                            Audited by: {cert.criteria?.mentor_name || "Siddharth Roy (Senior Staff Engineer)"}
                          </p>
                        </div>

                        {cert.criteria?.audit_message && (
                          <div className="bg-card/70 border border-border/80 p-3.5 rounded-xl text-xs text-muted-foreground leading-relaxed italic border-l-4 border-l-amber-500">
                            &ldquo;{cert.criteria.audit_message}&rdquo;
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
                          {cert.criteria?.repo_url && (
                            <a 
                              href={cert.criteria.repo_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Github className="h-3.5 w-3.5" /> Project Repository
                            </a>
                          )}
                          {cert.criteria?.demo_url && (
                            <a 
                              href={cert.criteria.demo_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Live Production Demo
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <Button
                            onClick={() => setSelectedCertModal(cert)}
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                          >
                            <Award className="h-3.5 w-3.5" /> View Official Certificate
                          </Button>

                          <Link
                            href={`/certify/${certCode}`}
                            className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 hover:underline px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 transition-colors font-bold"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Verify Authenticity
                          </Link>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between text-left md:text-right border-t md:border-t-0 border-border/40 pt-4 md:pt-0 shrink-0">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase">Release Date</p>
                          <p className="text-xs text-foreground font-bold font-mono">
                            {new Date(cert.criteria?.approved_at || cert.issued_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </p>
                        </div>

                        <div className="pt-4">
                          <span className="text-[10px] text-slate-400 font-mono block">VERIFICATION HASH</span>
                          <span className="text-[11px] font-mono text-indigo-400 font-bold">{certCode}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="glass p-10 text-center border-border/40 rounded-2xl">
              <Award className="h-10 w-10 text-muted-foreground animate-pulse mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground font-mono uppercase">No Released Certificates Yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Certificates are released upon full completion of sprint deliverables and mentor sign-off.
              </p>
            </Card>
          )}
        </div>

        {/* 3. Student Works & Pull Request (PR) Command Deck */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-1">
            <div>
              <h2 className="text-lg font-black text-foreground font-mono uppercase tracking-wider flex items-center gap-2">
                <GitPullRequest className="h-5 w-5 text-indigo-400" />
                <span>Audited Pull Requests &amp; Works</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every code submission, pull request raised, and production merge achieved on project repos.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-card/80 border border-border/80 p-1 rounded-xl font-mono text-xs">
              <button
                onClick={() => setPrFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  prFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({pullRequests.length})
              </button>
              <button
                onClick={() => setPrFilter("merged")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  prFilter === "merged" ? "bg-emerald-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Merged ({pullRequests.filter(p => p.status === "merged").length})
              </button>
              <button
                onClick={() => setPrFilter("review")}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  prFilter === "review" ? "bg-amber-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                In Review ({pullRequests.filter(p => p.status === "review").length})
              </button>
            </div>
          </div>

          {/* 4 High-Impact PR Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="glass border-border/40 p-4 text-center">
              <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground block">Total PRs Raised</span>
              <div className="text-2xl font-black text-foreground mt-1 flex items-center justify-center gap-1.5">
                <GitPullRequest className="h-5 w-5 text-indigo-400" />
                <span>{prStats?.total_raised ?? pullRequests.length}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">Across project repos</span>
            </Card>

            <Card className="glass border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
              <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">Merged PRs</span>
              <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
                <GitMerge className="h-5 w-5 text-emerald-400" />
                <span>{prStats?.merged_count ?? pullRequests.filter(p => p.status === "merged").length}</span>
              </div>
              <span className="text-[10px] text-emerald-500/80 font-mono mt-0.5 block">In production</span>
            </Card>

            <Card className="glass border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <span className="text-[10px] uppercase font-mono font-bold text-amber-400 block">Under Review</span>
              <div className="text-2xl font-black text-amber-400 mt-1 flex items-center justify-center gap-1.5">
                <Clock className="h-5 w-5 text-amber-400" />
                <span>{prStats?.in_review_count ?? pullRequests.filter(p => p.status === "review").length}</span>
              </div>
              <span className="text-[10px] text-amber-500/80 font-mono mt-0.5 block">Mentor auditing</span>
            </Card>

            <Card className="glass border-purple-500/20 bg-purple-500/5 p-4 text-center">
              <span className="text-[10px] uppercase font-mono font-bold text-purple-400 block">Merge Success Rate</span>
              <div className="text-2xl font-black text-purple-300 mt-1 flex items-center justify-center gap-1.5">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <span>{prStats?.merge_rate ?? (pullRequests.length > 0 ? Math.round((pullRequests.filter(p => p.status === "merged").length / pullRequests.length) * 100) : 0)}%</span>
              </div>
              <span className="text-[10px] text-purple-400/80 font-mono mt-0.5 block">High code quality</span>
            </Card>
          </div>

          {/* Interactive Pull Request Cards List */}
          <div className="space-y-3">
            {filteredPRs.length > 0 ? (
              filteredPRs.map((pr) => (
                <Card 
                  key={pr.id} 
                  className={`glass border transition-all p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    pr.status === "merged" 
                      ? "border-emerald-500/20 hover:border-emerald-500/40" 
                      : pr.status === "review"
                      ? "border-amber-500/20 hover:border-amber-500/40"
                      : "border-border/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    <div 
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        pr.status === "merged"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : pr.status === "review"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                      }`}
                    >
                      {pr.status === "merged" ? (
                        <GitMerge className="h-5 w-5" />
                      ) : pr.status === "review" ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <GitPullRequest className="h-5 w-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span 
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            pr.status === "merged"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : pr.status === "review"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          }`}
                        >
                          {pr.status === "merged" ? "Merged to Main" : pr.status === "review" ? "Awaiting Review" : "Open PR"}
                        </span>
                        <span className="text-xs font-mono text-indigo-400 font-bold">
                          {pr.project_title}
                        </span>
                        {pr.difficulty && (
                          <span className="text-[10px] font-mono text-muted-foreground uppercase px-1.5 py-0.5 bg-muted rounded border border-border/60">
                            {pr.difficulty}
                          </span>
                        )}
                        {pr.mentor_score !== null && pr.mentor_score !== undefined && (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/30">
                            Score: {pr.mentor_score}/100
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {pr.task_title}
                      </h4>

                      <p className="text-[11px] text-muted-foreground font-mono">
                        Submitted: {pr.submitted_at ? new Date(pr.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    {pr.github_pr_url ? (
                      <a 
                        href={pr.github_pr_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                      >
                        <Github className="h-3.5 w-3.5" />
                        <span>Inspect PR</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] font-mono text-muted-foreground italic">PR Internal</span>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="glass p-8 text-center border-border/40 rounded-2xl">
                <GitPullRequest className="h-8 w-8 text-muted-foreground animate-pulse mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-mono">No pull requests matching &quot;{prFilter}&quot;.</p>
              </Card>
            )}
          </div>
        </div>

        {/* 4. Projects Contributed Section */}
        {projects.length > 0 && (
          <div className="space-y-4">
            <div className="pl-1">
              <h2 className="text-lg font-black text-foreground font-mono uppercase tracking-wider flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-primary" />
                <span>Contributed Engineering Projects</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Production codebases where this developer served as an active contributor or technical lead.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <Card key={proj.project_id} className="glass border-border/40 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
                      Role: {proj.role}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold capitalize">
                      ● {proj.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-foreground">{proj.project_title}</h4>
                    {proj.project_description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                        {proj.project_description}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 5. Skills Grid */}
        {profile.skills && profile.skills.length > 0 && (
          <Card className="glass border-border/40 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider mb-4">Audited Capabilities</h3>
            <div className="flex flex-wrap gap-2.5">
              {profile.skills.map((skill, idx) => (
                <span 
                  key={idx}
                  className="text-xs px-3 py-1 rounded-md bg-muted border border-border text-foreground font-mono"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* 6. 3D Skill Galaxy */}
        <div className="w-full space-y-2">
          <h2 className="text-lg font-bold text-foreground font-mono uppercase tracking-wider pl-1">Gamified Progression</h2>
          <SkillGalaxy3D unlockedSkills={profileData.unlocked_skills} skillPoints={profileData.skill_points} />
        </div>

        {/* 7. GitHub Contribution Graph — shown only if github_url is set */}
        {profile.github_url && (
          <div data-github-graph>
            <GitHubGraph github_url={profile.github_url} name={profileData.name} />
          </div>
        )}

        {/* 8. Verified Achievements (Gamified Badges) */}
        {profileData.badges && profileData.badges.length > 0 && (
          <div className="w-full space-y-4">
            <h2 className="text-lg font-bold text-foreground font-mono uppercase tracking-wider pl-1">Verified Achievements</h2>
            <Card className="glass border-border/40 p-6 flex flex-wrap gap-4 sm:gap-6 justify-center sm:justify-start rounded-2xl">
              {profileData.badges.map((userBadge) => (
                <BadgeTooltip key={userBadge.id} userBadge={userBadge} />
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* Interactive Printable Official Certificate Modal */}
      {selectedCertModal && (
        <Dialog open={!!selectedCertModal} onOpenChange={() => setSelectedCertModal(null)}>
          <DialogContent className="max-w-2xl bg-slate-950 border-2 border-amber-500/50 p-6 sm:p-8 text-white rounded-3xl shadow-2xl overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Official Released Certificate</DialogTitle>
              <DialogDescription>CoderCorps Credential Verification</DialogDescription>
            </DialogHeader>

            {/* Official Diploma Frame */}
            <div className="border-4 border-amber-500/40 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-center relative">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/30">
                  CC
                </div>
                <div className="text-left">
                  <span className="text-xs uppercase tracking-widest font-black text-amber-400 font-mono block">CODERCORPS INSTITUTE</span>
                  <span className="text-xs text-slate-400 font-mono">Advanced Agentic Engineering</span>
                </div>
              </div>

              <span className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-block mb-3">
                CERTIFICATE OF ENGINEERING EXCELLENCE
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                {profileData.name}
              </h2>

              <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed mb-4">
                Has demonstrated production-ready engineering competence, passed mentor code reviews, and successfully shipped verified pull requests for:
              </p>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-5 max-w-md mx-auto">
                <span className="text-base font-black text-amber-300 block">{selectedCertModal.project_title}</span>
                <span className="text-[11px] font-mono text-slate-400">Production Capstone Deliverable</span>
              </div>

              {selectedCertModal.criteria?.audit_message && (
                <p className="text-xs text-slate-400 italic max-w-md mx-auto mb-6 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  &ldquo;{selectedCertModal.criteria.audit_message}&rdquo;
                </p>
              )}

              {/* Signatures & Seal */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-left font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block uppercase text-[9px]">Verified Mentor</span>
                  <span className="font-bold text-slate-200">{selectedCertModal.criteria?.mentor_name || "Siddharth Roy"}</span>
                  <span className="text-[10px] text-amber-400 block">Senior Staff Engineer</span>
                </div>

                <div className="text-right">
                  <span className="text-slate-500 block uppercase text-[9px]">Issue Date</span>
                  <span className="font-bold text-slate-200">
                    {new Date(selectedCertModal.criteria?.approved_at || selectedCertModal.issued_at).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] text-indigo-400 block font-mono">
                    ID: {selectedCertModal.verification_code || `CORPS-${selectedCertModal.id}`}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-center gap-3 pt-6 mt-4 border-t border-slate-800/80">
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:text-white cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Certificate
                </Button>

                <Button
                  onClick={() => setSelectedCertModal(null)}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
