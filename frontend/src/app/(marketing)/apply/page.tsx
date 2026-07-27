"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Award, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Mail, 
  User, 
  Phone, 
  GraduationCap, 
  FileText, 
  Send, 
  RotateCcw, 
  AlertTriangle,
  Globe,
  FileCode,
  Share2,
  Link2,
  FolderGit2,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function PublicApplyPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [whyJoin, setWhyJoin] = useState("");

  // Social & Resume Links
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Resend state
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        college: college.trim() || null,
        why_join: whyJoin.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        resume_url: resumeUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null
      };

      let res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await api.post("/apply", payload, { skipAuth: true });
      }

      if (res.ok) {
        setSubmitted(true);
        setCooldown(30);
        toast.success("Application submitted! Check your email.");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Failed to submit application.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error submitting application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0 || resending) return;

    try {
      setResending(true);
      const payload = {
        name: name.trim() || "Candidate",
        email: email.trim(),
        phone: phone.trim() || null,
        college: college.trim() || null,
        why_join: whyJoin.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        resume_url: resumeUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null
      };

      let res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await api.post("/apply", payload, { skipAuth: true });
      }

      if (res.ok) {
        setCooldown(30);
        toast.success(`Assessment link resent to ${email}!`);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Could not resend email.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error resending email.");
    } finally {
      setResending(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
        <Card className="max-w-lg w-full glass border-border/60 text-center p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="h-16 w-16 bg-emerald-500/15 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Application Received!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Check your email — your 1-time assessment link is on its way to <strong className="text-foreground">{email}</strong>.
            </p>
          </div>

          {/* What Happens Next Box */}
          <div className="p-4 bg-background/50 rounded-xl border border-border/40 text-xs text-muted-foreground space-y-1.5 font-mono text-left">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" /> What happens next?
            </p>
            <p>1. Open the email and click your unique 1-time assessment link.</p>
            <p>2. Complete the 10-question timed Python test (link valid for 24 hours).</p>
            <p>3. View your instant score & detailed question breakdown upon submission.</p>
          </div>

          {/* Important Spam / Junk Note */}
          <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 text-left flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-0.5">
              <strong className="font-bold block text-foreground">Can't find your email?</strong>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Please check your <strong>Spam</strong>, <strong>Junk</strong>, or <strong>Promotions</strong> folder as automated screening links are sometimes filtered there.
              </p>
            </div>
          </div>

          {/* Action Buttons: Resend + Back Home */}
          <div className="space-y-2 pt-2">
            <Button
              type="button"
              onClick={handleResendEmail}
              disabled={resending || cooldown > 0}
              variant="outline"
              className="w-full font-bold h-11 rounded-xl border-primary/40 text-primary hover:bg-primary/10 gap-2"
            >
              {resending ? (
                "Resending Link..."
              ) : cooldown > 0 ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin text-muted-foreground" /> Resend Link ({cooldown}s)
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Resend Assessment Link to Email
                </>
              )}
            </Button>

            <Button asChild className="w-full font-bold h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/">Back to Homepage</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="max-w-2xl w-full space-y-6">
        {/* Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Technical Screening Application
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Apply to CoderCorps
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Submit your candidate application to receive your personalized, timed Python screening test link via email.
          </p>
        </div>

        {/* Application Card */}
        <Card className="glass border-border/60 shadow-lg">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-foreground">Candidate Profile</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                No login required. We will send your assessment link directly to your inbox.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Primary Contact Info */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Full Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Alex Chen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 bg-background/50 border-input rounded-xl focus:ring-primary/45"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email Address *
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 bg-background/50 border-input rounded-xl focus:ring-primary/45"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Phone Number (Optional)
                    </label>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 019-2834"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 bg-background/50 border-input rounded-xl focus:ring-primary/45"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" /> University / College
                    </label>
                    <Input
                      placeholder="e.g. Stanford University"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="h-10 bg-background/50 border-input rounded-xl focus:ring-primary/45"
                    />
                  </div>
                </div>
              </div>

              {/* Developer Links Section */}
              <div className="pt-2 border-t border-border/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase text-foreground flex items-center gap-1.5">
                    <FolderGit2 className="h-3.5 w-3.5 text-primary" /> Professional & Portfolio Links
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">(Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-500" /> LinkedIn Profile
                    </label>
                    <Input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="h-10 bg-background/50 border-input rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-foreground" /> GitHub Profile
                    </label>
                    <Input
                      type="url"
                      placeholder="https://github.com/username"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="h-10 bg-background/50 border-input rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Resume Drive Link + Public Access Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-500" /> Resume / Portfolio Link
                  </label>
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/file/d/... or https://myportfolio.dev"
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    className="h-10 bg-background/50 border-input rounded-xl text-xs"
                  />
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1 font-mono pt-0.5">
                    <Info className="h-3 w-3 shrink-0 mt-0.5" />
                    <span><strong>Note:</strong> Please make sure your Google Drive or Resume link is set to public/shared access (e.g. <em>"Anyone with the link can view"</em>).</span>
                  </p>
                </div>

                {/* Instagram Handle (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Share2 className="h-3.5 w-3.5 text-pink-500" /> Instagram Profile (Optional)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://instagram.com/username"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="h-10 bg-background/50 border-input rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Statement */}
              <div className="pt-2 border-t border-border/40 space-y-1.5">
                <label className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Why do you want to join? (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell us briefly about your engineering background and goals..."
                  value={whyJoin}
                  onChange={(e) => setWhyJoin(e.target.value)}
                  className="w-full p-3 bg-background/50 border border-input rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45"
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full font-bold h-11 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground gap-2 shadow-md"
              >
                {submitting ? (
                  "Submitting Application..."
                ) : (
                  <>
                    Submit Application & Receive Test Link <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
