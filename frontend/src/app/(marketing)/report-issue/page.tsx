"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  X, 
  HelpCircle, 
  Mail, 
  Link as LinkIcon, 
  ShieldCheck, 
  ArrowLeft,
  Loader2
} from "lucide-react";

export default function ReportIssuePage() {
  const { user, loading: authLoading } = useAuth();

  // Form State
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reporterRole, setReporterRole] = useState("other");
  const [reporterRoleDetail, setReporterRoleDetail] = useState("");

  const [category, setCategory] = useState("website_bug");
  const [pageUrl, setPageUrl] = useState("");
  const [description, setDescription] = useState("");

  // Assessment-specific extra fields
  const [assessmentEmailUsed, setAssessmentEmailUsed] = useState("");
  const [assessmentLinkReceived, setAssessmentLinkReceived] = useState<boolean | null>(null);
  const [assessmentLinkWorked, setAssessmentLinkWorked] = useState<boolean | null>(null);

  // Screenshot upload state
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  // Honeypot field (hidden from real users, bots fill)
  const [honeypot, setHoneypot] = useState("");

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);

  // Auto-fill logged in user info and referrer URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Auto-capture referrer URL if available
      if (document.referrer && !document.referrer.includes("/report-issue")) {
        setPageUrl(document.referrer);
      } else {
        setPageUrl(window.location.origin);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.name) setReporterName(user.name);
      if (user.email) setReporterEmail(user.email);
      if (user.role) {
        if (["student", "mentor"].includes(user.role)) {
          setReporterRole(user.role);
        } else {
          setReporterRole("other");
        }
      }
    }
  }, [user]);

  // Process File for Instant Local Preview + Async Backend Upload
  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP, GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot image size must be 5MB or less.");
      return;
    }

    setError(null);

    // 1. Instant client-side Data URL preview
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setScreenshotUrl(dataUrl);

      // 2. Upload screenshot to Supabase Storage via Next.js API route
      try {
        setUploadingScreenshot(true);
        setError(null);
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/issue-reports/upload-screenshot", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const res = await response.json();
          if (res && res.screenshot_url && typeof res.screenshot_url === "string" && res.screenshot_url.trim().length > 0) {
            console.log("[REPORT ISSUE] Supabase public image URL set:", res.screenshot_url);
            setScreenshotUrl(res.screenshot_url);
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const detailMsg = errData?.detail || "Cloud storage upload failed.";
          console.error("[REPORT ISSUE UPLOAD ERROR]", response.status, detailMsg);
          setError(`⚠️ Screenshot upload failed: ${detailMsg} You can try selecting the image again or submit the report without a screenshot.`);
          setScreenshotUrl(null);
        }
      } catch (err: any) {
        console.error("[REPORT ISSUE UPLOAD EXCEPTION]", err);
        setError(`⚠️ Screenshot upload network error: ${err.message || "Failed to reach upload server."}`);
        setScreenshotUrl(null);
      } finally {
        setUploadingScreenshot(false);
      }
    };
    reader.readAsDataURL(file);
  };


  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };


  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterName.trim() || !reporterEmail.trim() || !description.trim()) {
      setError("Please fill in all required fields (Name, Email, Description).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        reporter_name: reporterName.trim(),
        reporter_email: reporterEmail.trim(),
        reporter_role: reporterRole,
        reporter_role_detail: reporterRole === "other" && reporterRoleDetail.trim() ? reporterRoleDetail.trim() : null,
        category,
        description: description.trim(),
        page_url: pageUrl.trim() || null,
        screenshot_url: screenshotUrl || null,
      };

      if (category === "assessment_email_issue") {
        payload.assessment_email_used = assessmentEmailUsed.trim() || reporterEmail.trim();
        payload.assessment_link_received = assessmentLinkReceived;
        payload.assessment_link_worked = assessmentLinkWorked;
      }

      const response = await fetch("/api/issue-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to submit report. Please try again.");
      }

      const res = await response.json();
      setSubmittedReport(res || { id: "SUCCESS", reporter_email: reporterEmail });
    } catch (err: any) {
      setError(err.message || "Failed to submit issue report. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };


  // -------------------------------------------------------------------------
  // CONFIRMATION SCREEN
  // -------------------------------------------------------------------------
  if (submittedReport) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full bg-card border border-border rounded-2xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-2">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Report Received!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Thank you for reporting this issue. Our technical & admissions team has been notified at{" "}
              <span className="font-semibold text-foreground">codercorps@gmail.com</span> and a confirmation receipt was sent to{" "}
              <span className="font-semibold text-foreground">{submittedReport.reporter_email || reporterEmail}</span>.
            </p>
          </div>

          <div className="bg-muted/40 border border-border rounded-xl p-4 text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Ticket Reference:</span>
              <span className="font-bold text-foreground">#{submittedReport.id || "REC-2026"}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Category:</span>
              <span className="font-bold text-foreground uppercase">{category.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Status:</span>
              <span className="font-bold text-emerald-400">OPEN & ASSIGNED</span>
            </div>
          </div>

          {category === "assessment_email_issue" && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 text-left leading-relaxed">
              <strong>📢 Assessment Support Note:</strong> Our team prioritizes assessment delivery issues. If your test link expired or was not received, we will verify your application and send a fresh link shortly.
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedReport(null);
                setDescription("");
                setScreenshotUrl(null);
              }}
            >
              Submit Another Report
            </Button>

            <Link href="/">
              <Button className="font-semibold">Return to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // MAIN REPORT FORM
  // -------------------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          Report an Issue <HelpCircle className="h-7 w-7 text-primary" />
        </h1>
        <p className="text-muted-foreground text-sm">
          Encountered a bug, login trouble, or missing assessment email? Fill out this form to notify our admissions & engineering teams immediately.
        </p>
      </div>

      {user && (
        <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs text-primary">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Signed in as <strong>{user.name}</strong> ({user.email}) &bull; Role: <strong>{user.role}</strong></span>
          </div>
          <span className="text-[10px] bg-primary/20 px-2 py-0.5 rounded font-mono uppercase">Verified Account</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* HONEYPOT FIELD - Hidden offscreen for anti-bot protection */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}>
          <label htmlFor="website_hp">Do not fill this field</label>
          <input
            type="text"
            id="website_hp"
            name="website_hp"
            tabIndex={-1}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Name & Email Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Your Name <span className="text-destructive">*</span></label>
            <input
              type="text"
              required
              disabled={!!user}
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-75"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Your Email Address <span className="text-destructive">*</span></label>
            <input
              type="email"
              required
              disabled={!!user}
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="e.g. alex@example.com"
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-75"
            />
          </div>
        </div>

        {/* Role & Role Detail Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Your Role</label>
            <select
              disabled={!!user}
              value={reporterRole}
              onChange={(e) => setReporterRole(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-75"
            >
              <option value="student">Student / Intern</option>
              <option value="mentor">Mentor / Educator</option>
              <option value="candidate">Applicant / Candidate</option>
              <option value="other">Other / Visitor</option>
            </select>
          </div>

          {reporterRole === "other" && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Role Details (Optional)</label>
              <input
                type="text"
                value={reporterRoleDetail}
                onChange={(e) => setReporterRoleDetail(e.target.value)}
                placeholder="e.g. Final-year applicant, Guest user"
                className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Issue Category Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Issue Category <span className="text-destructive">*</span></label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="website_bug">🐛 Website Bug or Display Error</option>
            <option value="assessment_email_issue">📧 Assessment Email / Link Issue (Not received or link broken)</option>
            <option value="account_login">🔑 Account or Login Problem</option>
            <option value="feature_request">💡 Feature Request or Suggestion</option>
            <option value="other">❓ Other Issue / General Help</option>
          </select>
        </div>

        {/* CONDITIONAL FIELDS FOR ASSESSMENT EMAIL ISSUE */}
        {category === "assessment_email_issue" && (
          <div className="p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Mail className="h-4 w-4" /> Assessment Email Triage Details
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-200/90 uppercase tracking-wider">Which email address did you use when applying?</label>
              <input
                type="email"
                value={assessmentEmailUsed}
                onChange={(e) => setAssessmentEmailUsed(e.target.value)}
                placeholder={reporterEmail || "e.g. candidate@gmail.com"}
                className="w-full px-3.5 py-2 bg-background border border-amber-500/30 rounded-xl text-sm text-foreground focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-amber-200/90">Did you receive the invitation email?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssessmentLinkReceived(true)}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      assessmentLinkReceived === true
                        ? "bg-amber-500 text-black border-amber-400 shadow-md"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yes, I got it
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentLinkReceived(false)}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      assessmentLinkReceived === false
                        ? "bg-amber-500 text-black border-amber-400 shadow-md"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    No, never arrived
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-amber-200/90">Did the assessment link work?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssessmentLinkWorked(true)}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      assessmentLinkWorked === true
                        ? "bg-amber-500 text-black border-amber-400 shadow-md"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yes, worked
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentLinkWorked(false)}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      assessmentLinkWorked === false
                        ? "bg-amber-500 text-black border-amber-400 shadow-md"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    No, link error / expired
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page URL input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" /> Page URL Where Issue Happened (Optional)
          </label>
          <input
            type="text"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            placeholder="e.g. https://codercorps.com/apply"
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-mono text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Issue Description textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Detailed Description <span className="text-destructive">*</span></label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe what happened, what error message you saw, or what was expected..."
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-y"
          />
        </div>

        {/* Screenshot Upload Picker & Preview */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Upload Screenshot (Optional)</span>
            <span className="text-[10px] text-muted-foreground font-normal">PNG, JPG up to 5MB</span>
          </label>

          {screenshotUrl ? (
            <div className="relative inline-block border border-border rounded-xl overflow-hidden bg-muted/30 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshotUrl} alt="Screenshot preview" className="max-h-40 rounded-lg object-contain" />
              <button
                type="button"
                onClick={() => setScreenshotUrl(null)}
                className="absolute top-3 right-3 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors shadow-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 cursor-pointer bg-background/50 hover:bg-muted/20 transition-all text-center"
            >

              {uploadingScreenshot ? (
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <Loader2 className="h-5 w-5 animate-spin" /> Uploading image...
                </div>
              ) : (
                <div className="space-y-2 text-muted-foreground">
                  <Upload className="h-7 w-7 mx-auto text-primary/70" />
                  <div className="text-xs font-medium">
                    <span className="text-primary font-bold">Click to upload</span> or drag and drop image screenshot
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                disabled={uploadingScreenshot}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={submitting || uploadingScreenshot}
          className="w-full py-3.5 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Submitting Issue Report...
            </span>
          ) : (
            "Submit Report & Send to Support →"
          )}
        </Button>
      </form>
    </div>
  );
}
