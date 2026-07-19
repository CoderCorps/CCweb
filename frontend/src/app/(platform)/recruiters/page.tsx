"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, Code2, Star, Loader2 } from "lucide-react";
import Image from "next/image";

interface Candidate {
  user: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  skills: string[];
  skill_points: number;
  bio: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  top_submissions: Array<{
    task_title: string;
    repo_url: string;
    score: number;
    ai_score: number | null;
  }>;
}

export default function RecruitersPortal() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchSkill, setSearchSkill] = useState("");

  const fetchCandidates = async (skillFilter = "") => {
    setLoading(true);
    try {
      const url = skillFilter ? `/recruiters/candidates?skill=${encodeURIComponent(skillFilter)}` : "/recruiters/candidates";
      const res = await api.get(url);
      if (res.ok) {
        setCandidates(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates(searchSkill);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">

      <div className="glass p-8 rounded-2xl border-border/40 text-center">
        <h1 className="text-3xl font-extrabold text-white mb-2 font-mono uppercase tracking-tight">Recruiter "Proof-of-Work" Portal</h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Hire verified builders. Search through our Skill Galaxy to find candidates who have written, merged, and deployed code that passed strict mentor audits.
        </p>
      </div>

      <div className="glass p-4 rounded-xl border-border/40">
        <form onSubmit={handleSearch} className="flex gap-3 max-w-xl mx-auto">
          <div className="relative grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by Skill Galaxy nodes (e.g. React, Python, AWS)..."
              value={searchSkill}
              onChange={(e) => setSearchSkill(e.target.value)}
              className="pl-9 bg-card/60 border-border"
            />
          </div>
          <Button type="submit" className="font-bold">Scan Candidates</Button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((c, i) => (
            <Card key={i} className="glass border-border/40 hover:border-indigo-500/30 transition-colors flex flex-col">
              <CardHeader className="pb-3 border-b border-border/20">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    {c.user.avatar_url ? (
                      <Image src={c.user.avatar_url} alt={c.user.name} className="h-full w-full object-cover" width={48} height={48} />
                    ) : (
                      <span className="font-bold text-lg text-indigo-400">{c.user.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="grow">
                    <CardTitle className="text-lg text-white font-bold">
                      <a href={`/recruiters/candidate/${c.user.id}`} className="hover:underline">{c.user.name}</a>
                    </CardTitle>
                    <div className="flex items-center gap-1.5 mt-1 text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded w-fit">
                      <Star className="h-3 w-3" /> {c.skill_points} SP
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col gap-4 grow">
                {c.bio && <p className="text-xs text-muted-foreground line-clamp-2">{c.bio}</p>}

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {c.skills.slice(0, 5).map(skill => (
                    <span key={skill} className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                      {skill}
                    </span>
                  ))}
                  {c.skills.length > 5 && (
                    <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5">+{c.skills.length - 5}</span>
                  )}
                </div>

                {/* Submissions Proof of Work */}
                <div className="mt-auto space-y-2 pt-4 border-t border-border/20">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">Top Verified Code</span>
                  {c.top_submissions.length > 0 ? c.top_submissions.map((sub, idx) => (
                    <div key={idx} className="bg-card/40 rounded border border-border/40 p-2 text-xs flex justify-between items-center">
                      <span className="truncate max-w-37.5 font-bold text-slate-300" title={sub.task_title}>{sub.task_title}</span>
                      <div className="flex items-center gap-2">
                        {sub.ai_score && <span className="text-[9px] text-indigo-400 font-mono" title="AI Score">🤖{sub.ai_score}</span>}
                        <span className="text-[9px] text-emerald-400 font-mono font-bold" title="Mentor Score">{sub.score}/100</span>
                        {sub.repo_url && (
                          <a href={sub.repo_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white transition-colors">
                            <Code2 className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )) : (
                    <p className="text-[10px] text-muted-foreground italic">No graded submissions yet.</p>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  {c.github_url && (
                    <a href={c.github_url} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1 text-[10px] bg-card hover:bg-white/10 border border-border/60 py-1.5 rounded transition-colors text-slate-300">
                      GitHub <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {c.linkedin_url && (
                    <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1 text-[10px] bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 text-blue-300 py-1.5 rounded transition-colors">
                      LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>

              </CardContent>
            </Card>
          ))}
          {candidates.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No candidates found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
