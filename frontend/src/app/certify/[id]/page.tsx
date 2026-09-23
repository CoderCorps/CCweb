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
  FolderGit2, 
  Download, 
  Eye, 
  FileCheck2
} from "lucide-react";
import { motion } from "framer-motion";

interface TemplateField {
  field_key: string;
  x_percent: number;
  y_percent: number;
  font_size?: number;
  color?: string;
  font_family?: string;
  text_align?: string;
}

interface TemplateData {
  id: number;
  name: string;
  background_image_url: string;
  width_px: number;
  height_px: number;
  fields: TemplateField[];
}

interface CertificateData {
  id: number;
  holder_name: string;
  project_title: string;
  issued_at: string;
  criteria_met: Record<string, string>;
  mentor_name: string;
  title?: string;
  certificate_number?: string;
  public_url?: string;
  template?: TemplateData | null;
}

export default function CertifyPage() {
  const { id } = useParams();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "audit">("visual");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let res = await api.get(`/certificates/verify/${id}`, { skipAuth: true });
        if (!res.ok) {
          res = await api.get(`/certificates/${id}`, { skipAuth: true });
        }
        if (res.ok) {
          const data = await res.json();
          setCert(data);
        } else {
          setNotFound(true);
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
        <p className="text-sm font-mono text-muted-foreground animate-pulse">Verifying certificate with CoderCorps registry...</p>
      </div>
    );
  }

  if (notFound || !cert) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4 p-4 text-center">
        <Award className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Certificate Not Found</h1>
        <p className="text-sm text-muted-foreground">This certificate ID does not exist or has not been issued yet.</p>
        <Link href="/" className="text-primary text-sm hover:underline font-mono">← Return to CoderCorps</Link>
      </div>
    );
  }

  const issueDateFormatted = new Date(cert.criteria_met.approved_at || cert.issued_at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const certNumber = cert.certificate_number || `CC-2026-${String(cert.id).padStart(5, "0")}`;
  const verifyUrl = typeof window !== "undefined" ? window.location.href : (cert.public_url || "");

  const fieldValues: Record<string, string> = {
    student_name: cert.holder_name,
    holder_name: cert.holder_name,
    name: cert.holder_name,
    certificate_number: certNumber,
    issue_date: issueDateFormatted,
    date: issueDateFormatted,
    project_title: cert.project_title || cert.title || "Engineering Program",
    title: cert.title || "Certificate of Completion",
    mentor_name: cert.mentor_name || "Engineering Mentor",
    reviewer_name: cert.mentor_name || "Engineering Mentor",
    public_url: verifyUrl,
    certificate_link: verifyUrl,
  };

  const hasTemplate = !!cert.template;
  const isBlobUrl = cert.template?.background_image_url?.startsWith("blob:");
  const useFallbackBackground = !cert.template?.background_image_url || isBlobUrl || imgError;

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Verification Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 print:hidden"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-1 rounded-full text-xs font-semibold font-mono tracking-wide">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            OFFICIAL VERIFIED CERTIFICATE
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {cert.title || "Certificate of Completion"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
            CoderCorps Engineering Program · ID: {certNumber}
          </p>

          {/* Tab Selector */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setActiveTab("visual")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "visual"
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Certificate View
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "audit"
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              Audit & Verification Data
            </button>
          </div>
        </motion.div>

        {/* Visual Certificate View */}
        {activeTab === "visual" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center"
          >
            <div 
              id="certificate-render-frame"
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-border/40 select-none print:border-none print:shadow-none print:rounded-none"
              style={{
                aspectRatio: "2000 / 1414",
                maxWidth: "960px",
                backgroundColor: "#0b0f19",
                containerType: "inline-size",
              }}
            >
              {/* Background Layer */}
              {!useFallbackBackground ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cert.template?.background_image_url}
                  alt="Certificate Template Background"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                /* Fallback Official Elegant Parchment Frame if custom image isn't reachable */
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-12 flex flex-col justify-between border-[12px] border-amber-500/20">
                  <div className="absolute inset-2 border-2 border-dashed border-amber-400/30 pointer-events-none rounded-lg" />
                  
                  {/* Decorative Header */}
                  <div className="text-center pt-4 z-10">
                    <p className="text-[9px] sm:text-xs tracking-[0.3em] font-mono text-amber-400 uppercase">
                      CoderCorps Engineering Guild
                    </p>
                    <h2 className="text-lg sm:text-3xl font-serif tracking-wider text-slate-100 font-bold mt-1">
                      CERTIFICATE OF EXCELLENCE
                    </h2>
                    <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-2" />
                  </div>

                  {/* Watermark Logo */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <Award className="w-96 h-96 text-white" />
                  </div>

                  {/* Footer Signatures */}
                  <div className="flex justify-between items-end pb-4 px-4 z-10 text-[9px] sm:text-xs font-mono text-slate-400 border-t border-slate-700/50 pt-4">
                    <div>
                      <p className="font-semibold text-slate-200">{cert.mentor_name}</p>
                      <p className="text-[8px] sm:text-[10px] text-slate-400">Audited & Approved By</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-200">{issueDateFormatted}</p>
                      <p className="text-[8px] sm:text-[10px] text-slate-400">Date of Conformance</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Placed Fields */}
              {cert.template?.fields && cert.template.fields.length > 0 ? (
                cert.template.fields.map((f, idx) => {
                  if (f.field_key === "qr_code") {
                    return (
                      <div
                        key={idx}
                        className="absolute bg-white p-1 sm:p-1.5 rounded-lg shadow-lg flex items-center justify-center"
                        style={{
                          left: `${f.x_percent}%`,
                          top: `${f.y_percent}%`,
                          width: "10%",
                          height: "auto",
                          aspectRatio: "1/1",
                          transform: "translate(0%, -50%)",
                        }}
                      >
                        {/* Dynamic Live QR code */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`}
                          alt="Verification QR"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    );
                  }

                  const val = fieldValues[f.field_key] || `{${f.field_key}}`;
                  const fontSizeScale = f.font_size ? f.font_size / 24 : 1.2;

                  return (
                    <div
                      key={idx}
                      className="absolute whitespace-nowrap pointer-events-none font-bold tracking-normal drop-shadow-md"
                      style={{
                        left: `${f.x_percent}%`,
                        top: `${f.y_percent}%`,
                        fontSize: `${((f.font_size || 28) / (cert.template?.width_px || 2000)) * 100}cqi`,
                        color: f.color || (useFallbackBackground ? "#ffffff" : "#000000"),
                        fontFamily: f.font_family || "inherit",
                        textAlign: (f.text_align as any) || "left",
                        transform: f.text_align === "center" ? "translate(-50%, -50%)" : f.text_align === "right" ? "translate(-100%, -50%)" : "translate(0%, -50%)",
                      }}
                    >
                      {val}
                    </div>
                  );
                })
              ) : (
                /* Default dynamic placed elements if template fields aren't specified */
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center px-8">
                  <p className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-slate-400">
                    This is proudly presented to
                  </p>
                  <h3 className="text-xl sm:text-4xl font-extrabold text-white mt-1 mb-2 font-serif tracking-wide">
                    {cert.holder_name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-300 max-w-md">
                    for verified engineering completion of
                  </p>
                  <p className="text-sm sm:text-xl font-bold text-indigo-400 mt-1">
                    {cert.project_title}
                  </p>
                  <p className="text-[9px] sm:text-xs font-mono text-slate-400 mt-4">
                    Verification ID: {certNumber}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Audit Details Card (Tab or Print) */}
        {(activeTab === "audit" || typeof window === "undefined") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-emerald-500/20 bg-card p-6 sm:p-8 shadow-xl space-y-6"
          >
            <div className="text-center space-y-1 border-b border-border/40 pb-6">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Audited Engineering Achievement</p>
              <h2 className="text-3xl font-bold text-foreground">{cert.holder_name}</h2>
              <p className="text-sm text-muted-foreground">has successfully completed</p>
              <h3 className="text-xl font-semibold text-primary">{cert.project_title}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3.5 rounded-lg border border-border/40 bg-muted/20">
                <User className="h-4 w-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Audited By</p>
                  <p className="text-sm font-bold text-foreground">{cert.mentor_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-lg border border-border/40 bg-muted/20">
                <Calendar className="h-4 w-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Issued</p>
                  <p className="text-sm font-bold text-foreground">{issueDateFormatted}</p>
                </div>
              </div>
            </div>

            {cert.criteria_met.audit_message && (
              <blockquote className="text-xs text-muted-foreground leading-relaxed italic bg-muted/40 p-4 rounded-lg border-l-2 border-emerald-500/40">
                &ldquo;{cert.criteria_met.audit_message}&rdquo;
              </blockquote>
            )}

            <div className="flex flex-wrap gap-4 pt-2">
              {cert.criteria_met.repo_url && (
                <a
                  href={cert.criteria_met.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  <FolderGit2 className="h-4 w-4" />
                  Source Code Repository
                </a>
              )}
              {cert.criteria_met.demo_url && (
                <a
                  href={cert.criteria_met.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Live Functional Demo
                </a>
              )}
            </div>
          </motion.div>
        )}

        {/* Action Controls */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-center gap-3 pt-2 print:hidden"
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
            <Download className="h-4 w-4" />
            Print / Save as PDF
          </button>
          <Link
            href="/"
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors ml-2"
          >
            ← CoderCorps Home
          </Link>
        </motion.div>

        {/* Verification Link Footer */}
        <p className="text-center text-[10px] text-muted-foreground font-mono print:hidden">
          This certificate is officially registered & publicly verifiable on the CoderCorps Ledger at{" "}
          <span className="text-primary font-semibold">{verifyUrl}</span>
        </p>

      </div>
    </div>
  );
}

