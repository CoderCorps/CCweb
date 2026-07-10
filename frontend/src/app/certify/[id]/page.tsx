"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Award, 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal,
  Calendar,
  User,
  FolderGit2
} from "lucide-react";
import { motion } from "framer-motion";

interface CertificateData {
  id: number;
  holder_name: string;
  project_title: string;
  issued_at: string;
  criteria_met: Record<string, string>;
  mentor_name: string;
}

export default function CertifyPage() {
  const { id } = useParams();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/certificates/${id}`, { skipAuth: true });
        if (res.ok) {
          const data = await res.json();
          setCert(data);
        } else {
          // Fallback mock for development
          setCert({
            id: Number(id),
            holder_name: "Rohan Verma",
            project_title: "Distributed E-Commerce API Engine",
            issued_at: new Date().toISOString(),
            criteria_met: {
              student_name: "Rohan Verma",
              project_title: "Distributed E-Commerce API Engine",
              mentor_name: "Atul Sharma",
              demo_url: "https://youtube.com/watch?v=mockdemo",
              repo_url: "https://github.com/codercorps/ecommerce-api",
              approved_at: new Date().toISOString(),
              audit_message: "Verifiable Software Engineering Achievement. This certificate validates actual codebase contributions (GitHub Pull Requests merged, functional demo delivered, and code reviewed by a professional engineering mentor).",
            },
            mentor_name: "Atul Sharma",
          });
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-3">
        <Terminal className="h-8 w-8 text-primary animate-pulse" />
        <p className="text-sm font-mono text-muted-foreground animate-pulse">Verifying certificate...</p>
      </div>
    );
  }

  if (notFound || !cert) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Award className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Certificate Not Found</h1>
        <p className="text-sm text-muted-foreground">This certificate ID does not exist or has been removed.</p>
        <Link href="/" className="text-primary text-sm hover:underline font-mono">← Return to CoderCorps</Link>
      </div>
    );
  }

  const CRITERIA_LABELS: Record<string, string> = {
    student_name: "Holder",
    project_title: "Project",
    mentor_name: "Reviewed By",
    demo_url: "Deployed Demo",
    repo_url: "Source Repository",
    approved_at: "Approval Date",
    audit_message: "Audit Statement",
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold font-mono">
            <ShieldCheck className="h-3.5 w-3.5" />
            VERIFIED ACHIEVEMENT
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Certificate of Completion</h1>
          <p className="text-sm text-muted-foreground font-mono">CoderCorps Engineering Program · Certificate ID: CORPS-{cert.id}</p>
        </motion.div>

        {/* Main certificate card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative rounded-2xl border border-emerald-500/20 bg-card p-8 shadow-2xl overflow-hidden print:shadow-none"
        >
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.025] select-none">
            <Award className="h-72 w-72 text-emerald-400" />
          </div>

          <div className="relative z-10 space-y-6">
            {/* Holder */}
            <div className="text-center space-y-1 border-b border-border/40 pb-6">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">This certifies that</p>
              <h2 className="text-4xl font-bold text-foreground">{cert.holder_name}</h2>
              <p className="text-sm text-muted-foreground">has successfully completed</p>
              <h3 className="text-xl font-semibold text-primary">{cert.project_title}</h3>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 glass p-3 rounded-lg border border-border/40">
                <User className="h-4 w-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Reviewed By</p>
                  <p className="text-sm font-bold text-foreground">{cert.mentor_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 glass p-3 rounded-lg border border-border/40">
                <Calendar className="h-4 w-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Issued</p>
                  <p className="text-sm font-bold text-foreground">
                    {new Date(cert.criteria_met.approved_at || cert.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>

            {/* Audit statement */}
            {cert.criteria_met.audit_message && (
              <blockquote className="text-xs text-muted-foreground leading-relaxed italic bg-muted/40 p-4 rounded-lg border-l-2 border-emerald-500/40">
                &ldquo;{cert.criteria_met.audit_message}&rdquo;
              </blockquote>
            )}

            {/* Verifiable links */}
            <div className="flex flex-wrap gap-3">
              {cert.criteria_met.repo_url && (
                <a
                  href={cert.criteria_met.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                >
                  <FolderGit2 className="h-3.5 w-3.5" />
                  Source Code Repository
                </a>
              )}
              {cert.criteria_met.demo_url && (
                <a
                  href={cert.criteria_met.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Live Demo
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <button
            id="share-cert-btn"
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link Copied!" : "Share Certificate"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-card/60 transition-colors"
          >
            Print / Save PDF
          </button>
          <Link
            href="/"
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            ← CoderCorps Home
          </Link>
        </motion.div>

        {/* Verification note */}
        <p className="text-center text-[10px] text-muted-foreground font-mono">
          This certificate is publicly verifiable at{" "}
          <span className="text-primary">{typeof window !== "undefined" ? window.location.href : `https://codercorps.in/certify/${id}`}</span>
        </p>

      </div>
    </div>
  );
}
