"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  UserCircle, 
  FileText, 
  Award,
  Link2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check
} from "lucide-react";
import { Github, Linkedin } from "@/components/ui/icons";

export default function PortfolioEditorPage() {
  const { user, refreshUser } = useAuth();
  
  // Editor form state
  const [bio, setBio] = useState("");
  const [college, setCollege] = useState("");
  const [skills, setSkills] = useState(""); // comma separated
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setBio(user.profile.bio || "");
      setCollege(user.profile.college || "");
      setSkills(user.profile.skills?.join(", ") || "");
      setGithubUrl(user.profile.github_url || "");
      setLinkedinUrl(user.profile.linkedin_url || "");
      setResumeUrl(user.profile.resume_url || "");
      setIsPublic(user.profile.is_public);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    // Convert comma-separated string to Array of skills
    const skillsList = skills
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      const res = await api.patch("/portfolio/me", {
        bio,
        college,
        skills: skillsList,
        github_url: githubUrl || null,
        linkedin_url: linkedinUrl || null,
        resume_url: resumeUrl || null,
        is_public: isPublic
      });

      if (res.ok) {
        setSuccess(true);
        refreshUser(); // Refresh the global auth state
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert("Failed to save changes.");
      }
    } catch (err) {
      alert("Error saving portfolio details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  // Generate public portfolio link slug
  const slugName = user.name.toLowerCase().replace(/\s+/g, "-");
  const publicUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/portfolio/${slugName}`
    : `/portfolio/${slugName}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio Editor</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure your public profile credentials and view your certificate audit trails.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Form */}
        <div className="lg:col-span-8">
          <Card className="glass border-border/40">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Profile Details</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                All details will be displayed on your public verified developer card.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="p_college" className="text-xs font-semibold text-muted-foreground font-mono">COLLEGE / ALMA MATER</label>
                    <Input 
                      id="p_college" 
                      type="text" 
                      value={college} 
                      onChange={(e) => setCollege(e.target.value)} 
                      placeholder="BITS Pilani" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="p_skills" className="text-xs font-semibold text-muted-foreground font-mono">SKILLS (COMMA-SEPARATED)</label>
                    <Input 
                      id="p_skills" 
                      type="text" 
                      value={skills} 
                      onChange={(e) => setSkills(e.target.value)} 
                      placeholder="React, Python, FastAPI, Docker" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="p_bio" className="text-xs font-semibold text-muted-foreground font-mono">BIO</label>
                  <textarea
                    id="p_bio"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Aspiring backend engineer. Love building high concurrency database systems..."
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="p_github" className="text-xs font-semibold text-muted-foreground font-mono">GITHUB PROFILE URL</label>
                    <Input 
                      id="p_github" 
                      type="url" 
                      value={githubUrl} 
                      onChange={(e) => setGithubUrl(e.target.value)} 
                      placeholder="https://github.com/..." 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="p_linkedin" className="text-xs font-semibold text-muted-foreground font-mono">LINKEDIN URL</label>
                    <Input 
                      id="p_linkedin" 
                      type="url" 
                      value={linkedinUrl} 
                      onChange={(e) => setLinkedinUrl(e.target.value)} 
                      placeholder="https://linkedin.com/in/..." 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="p_resume" className="text-xs font-semibold text-muted-foreground font-mono">RESUME S3/CLOUDINARY LINK</label>
                    <Input 
                      id="p_resume" 
                      type="url" 
                      value={resumeUrl} 
                      onChange={(e) => setResumeUrl(e.target.value)} 
                      placeholder="https://drive.google.com/..." 
                    />
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="p-4 bg-border/20 border border-border/40 rounded-xl flex items-center justify-between gap-4 mt-6">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase font-mono">Public Visibility</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Let employers find and verify your certificates publicly.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isPublic ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPublic ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button type="submit" disabled={submitting} className="font-semibold px-8">
                    {submitting ? "Saving..." : "Save Profile Details"}
                  </Button>
                  {success && (
                    <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-in fade-in duration-200">
                      <ShieldCheck className="h-4 w-4" /> Credentials Saved!
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Public Share Widget */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass-premium border border-border/40">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-indigo-400 uppercase tracking-wider">Shareable Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Provide recruiters with this link to view your public developer card backed by cryptography-signed project certificates.
              </p>
              
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground">
                <span className="truncate flex-grow">{publicUrl}</span>
                <button 
                  onClick={handleCopyLink}
                  className="p-1 hover:bg-border/60 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              {isPublic && (
                <a href={publicUrl} target="_blank" rel="noreferrer" className="block w-full">
                  <Button variant="outline" className="w-full gap-1.5 font-semibold text-xs border-border">
                    <ExternalLink className="h-3.5 w-3.5" /> View Public Card
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
