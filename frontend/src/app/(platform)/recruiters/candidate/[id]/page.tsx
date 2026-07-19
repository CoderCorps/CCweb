"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Code2, CheckCircle, ExternalLink, ShieldCheck } from "lucide-react";

interface PortfolioItem {
  task_id: number;
  task_title: string;
  repo_url: string;
  demo_url: string;
  ci_status: string;
  test_coverage: number;
  mentor_score: number;
  ai_score: number | null;
  ai_feedback: any;
  submitted_at: string;
}

interface CandidatePortfolio {
  candidate_name: string;
  github_url: string | null;
  skills: Array<{ name: string; level: number }>;
  portfolio: PortfolioItem[];
}

export default function CandidatePortfolioPage() {
  const { id } = useParams();
  const [data, setData] = useState<CandidatePortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await api.get(`/recruiters/candidates/${id}/portfolio`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPortfolio();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!data) return <div className="text-center text-white py-20">Candidate not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-20">

      <div className="flex items-center justify-between glass p-6 rounded-2xl border-border/40">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">{data.candidate_name}'s Proof of Work</h1>
          <div className="flex gap-2 items-center text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Audited Contributions</span>
          </div>
        </div>
        {data.github_url && (
          <a href={data.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-card hover:bg-white/10 px-4 py-2 border border-border/60 rounded-lg transition-colors text-slate-300">
            <ExternalLink className="h-4 w-4" /> GitHub Profile
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {data.portfolio.map((item, idx) => (
          <Card key={idx} className="glass border-border/40 hover:border-indigo-500/30 transition-colors">
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl text-white font-bold">{item.task_title}</CardTitle>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 bg-emerald-500/10 px-3 py-1 rounded text-emerald-400 font-bold border border-emerald-500/20 text-sm">
                    <CheckCircle className="h-4 w-4" /> {item.mentor_score}/100 Mentor
                  </div>
                  {item.ai_score && (
                    <div className="flex items-center gap-1 bg-indigo-500/10 px-3 py-1 rounded text-indigo-400 font-bold border border-indigo-500/20 text-sm">
                      🤖 {item.ai_score}/100 AI
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs uppercase font-bold text-muted-foreground mb-2">Code & Deployment</h3>
                  <div className="flex gap-2">
                    {item.repo_url && (
                      <a href={item.repo_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-card border border-border/60 px-3 py-1.5 rounded text-sm text-white hover:bg-white/10 transition-colors">
                        <Code2 className="h-4 w-4 text-indigo-400" /> Repository
                      </a>
                    )}
                    {item.demo_url && (
                      <a href={item.demo_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-card border border-border/60 px-3 py-1.5 rounded text-sm text-white hover:bg-white/10 transition-colors">
                        <ExternalLink className="h-4 w-4 text-emerald-400" /> Live Demo
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase font-bold text-muted-foreground mb-2">CI/CD Pipeline</h3>
                  <div className="bg-card/40 p-3 rounded-lg border border-border/40 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Build Status</span>
                      <span className={`font-bold ${item.ci_status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.ci_status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Test Coverage</span>
                      <span className="font-bold text-white">{item.test_coverage || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${item.test_coverage || 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase font-bold text-muted-foreground mb-2">AI Pre-Review Feedback</h3>
                <div className="bg-card/60 p-4 rounded-lg border border-border/40 text-sm text-slate-300 h-full">
                  {item.ai_feedback && item.ai_feedback.feedback ? (
                    <ul className="list-disc list-inside space-y-1">
                      {item.ai_feedback.feedback.map((fb: string, i: number) => (
                        <li key={i}>{fb}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground italic">No AI feedback recorded.</span>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>
        ))}
        {data.portfolio.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No portfolio items found.</div>
        )}
      </div>

    </div>
  );
}
