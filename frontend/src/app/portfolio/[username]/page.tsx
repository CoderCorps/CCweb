"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Award,
  Link2,
  ExternalLink,
  ShieldCheck,
  Terminal,
  ArrowLeft,
  User as UserIcon
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
}

interface Certificate {
  id: number;
  project_title: string;
  issued_at: string;
  criteria: {
    student_name: string;
    project_title: string;
    mentor_name: string;
    demo_url: string;
    repo_url: string;
    approved_at: string;
    audit_message: string;
  };
}

export default function PublicPortfolioPage() {
  const { username } = useParams();
  const router = useRouter();
  const [profileData, setProfileData] = useState<User | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const res = await api.get(`/portfolio/${username}`, { skipAuth: true });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
          if (data.certificates) {
            setCerts(data.certificates);
          }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Terminal className="h-8 w-8 text-primary animate-pulse" />
        <span className="text-sm font-mono text-muted-foreground animate-pulse">Retrieving audited records...</span>
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

  return (
    <div className="bg-background text-foreground min-h-screen py-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent_60%)] -z-10" />

      <div className="max-w-4xl mx-auto space-y-8 font-sans">
        {/* Back Link */}
        <button 
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to CoderCorps
        </button>

        {/* Developer Card Header with 3D Tilt Wrapper */}
        <TiltCard scale={1.01} maxRotation={8}>
          <Card className="glass-premium border-border/40 p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 w-full">
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
                <div className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono">
                  <ShieldCheck className="h-3 w-3" /> VERIFIED DEVELOPER
                </div>
                <h1 className="text-3xl font-extrabold text-foreground">{profileData.name}</h1>
                <p className="text-sm text-indigo-400 font-mono">{profile.college}</p>
                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">{profile.bio}</p>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-3">
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-card border hover:bg-border/60 text-muted-foreground hover:text-foreground transition-colors">
                  <Github className="h-5 w-5" />
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-card border hover:bg-border/60 text-muted-foreground hover:text-foreground transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
              {profile.resume_url && (
                <a href={profile.resume_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-card border hover:bg-border/60 text-muted-foreground hover:text-foreground transition-colors">
                  <FileText className="h-5 w-5" />
                </a>
              )}
            </div>
          </Card>
        </TiltCard>

        {/* Skills Grid */}
        {profile.skills && profile.skills.length > 0 && (
          <Card className="glass border-border/40 p-6">
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

        {/* 3D Skill Galaxy */}
        <div className="w-full">
          <h2 className="text-lg font-bold text-foreground font-mono uppercase tracking-wider pl-1 mb-4">Gamified Progression</h2>
          <SkillGalaxy3D unlockedSkills={profileData.unlocked_skills} skillPoints={profileData.skill_points} />
        </div>

        {/* GitHub Contribution Graph — shown only if github_url is set */}
        {profile.github_url && (
          <div data-github-graph>
            <GitHubGraph github_url={profile.github_url} name={profileData.name} />
          </div>
        )}

        {/* Verified Achievements (Gamified Badges) */}
        {profileData.badges && profileData.badges.length > 0 && (
          <div className="w-full space-y-4">
            <h2 className="text-lg font-bold text-foreground font-mono uppercase tracking-wider pl-1">Verified Achievements</h2>
            <Card className="glass border-border/40 p-6 flex flex-wrap gap-4 sm:gap-6 justify-center sm:justify-start">
              {profileData.badges.map((userBadge) => (
                <BadgeTooltip key={userBadge.id} userBadge={userBadge} />
              ))}
            </Card>
          </div>
        )}

        {/* Verifiable Credentials Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground font-mono uppercase tracking-wider pl-1">Audited Project Commits</h2>
          
          {certs.length > 0 ? (
            <div className="space-y-6">
              {certs.map((cert) => (
                <Card key={cert.id} className="glass border-emerald-500/20 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Award className="h-32 w-32 text-emerald-400" />
                  </div>

                  <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ID: CORPS-{cert.id}
                        </span>
                        <h3 className="text-xl font-bold text-foreground mt-2">{cert.project_title}</h3>
                        <p className="text-xs text-indigo-400 font-mono mt-0.5">Audited by: {cert.criteria?.mentor_name || "Staff Engineer"}</p>
                      </div>

                      <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed italic bg-card/40 p-3 rounded-lg border">
                        &ldquo;{cert.criteria?.audit_message}&rdquo;
                      </p>

                      <div className="flex flex-wrap gap-4 text-xs font-mono">
                        {cert.criteria?.repo_url && (
                          <a href={cert.criteria.repo_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                            <Github className="h-3.5 w-3.5" /> Source Code PRs
                          </a>
                        )}
                        {cert.criteria?.demo_url && (
                          <a href={cert.criteria.demo_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3.5 w-3.5" /> Deployed Demo
                          </a>
                        )}
                      </div>
                    {/* Verify link */}
                      <Link
                        href={`/certify/${cert.id}`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verify Certificate
                      </Link>
                    </div>

                    <div className="flex flex-col justify-end text-left md:text-right border-t md:border-t-0 border-border/40 pt-4 md:pt-0">
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">Audit Date</p>
                      <p className="text-xs text-foreground font-bold font-mono">
                        {new Date(cert.criteria?.approved_at || cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="glass p-10 text-center border-border/40 rounded-xl">
              <Award className="h-8 w-8 text-muted-foreground animate-pulse mx-auto mb-3" />
              <p className="text-xs text-muted-foreground font-mono">NO ACTIVE PROJECT AUDITS LOGGED YET.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
