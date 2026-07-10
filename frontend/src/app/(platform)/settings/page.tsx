"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  User, 
  Lock, 
  Bell, 
  ShieldCheck, 
  AlertCircle, 
  Camera, 
  Upload,
  UserCircle
} from "lucide-react";

type TabType = "profile" | "account" | "notifications";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Profile Form States
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [college, setCollege] = useState("");
  const [skills, setSkills] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [availability, setAvailability] = useState(""); // Mentor office hours

  // Account Form States
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Notifications State (UI-only)
  const [notifReviews, setNotifReviews] = useState(true);
  const [notifSprints, setNotifSprints] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);

  // Submit Feedback States
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [notifSuccess, setNotifSuccess] = useState(false);

  // Load user data
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAvatarUrl(user.avatar_url || "");
      if (user.profile) {
        setBio(user.profile.bio || "");
        setCollege(user.profile.college || "");
        setSkills(user.profile.skills?.join(", ") || "");
        setGithubUrl(user.profile.github_url || "");
        setLinkedinUrl(user.profile.linkedin_url || "");
        setResumeUrl(user.profile.resume_url || "");
        setIsPublic(user.profile.is_public);
        setAvailability(user.profile.availability || "");
      }
    }
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image file size should be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(false);
    setProfileError(null);

    const skillsList = skills
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      const res = await api.patch("/portfolio/me", {
        name,
        email,
        avatar_url: avatarUrl || null,
        bio,
        college,
        skills: skillsList,
        github_url: githubUrl || null,
        linkedin_url: linkedinUrl || null,
        resume_url: resumeUrl || null,
        is_public: isPublic,
        availability: availability || null
      });

      if (res.ok) {
        setProfileSuccess(true);
        refreshUser();
        setTimeout(() => setProfileSuccess(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setProfileError(err.detail || "Failed to update profile credentials.");
      }
    } catch (err) {
      setProfileError("Error communicating with servers.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountLoading(true);
    setAccountSuccess(false);
    setAccountError(null);

    try {
      const res = await api.patch("/auth/account", {
        email,
        current_password: currentPassword || null,
        new_password: newPassword || null
      });

      if (res.ok) {
        setAccountSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        refreshUser();
        setTimeout(() => setAccountSuccess(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setAccountError(err.detail || "Failed to update account details.");
      }
    } catch (err) {
      setAccountError("Error communicating with servers.");
    } finally {
      setAccountLoading(false);
    }
  };

  const handleNotifSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 3000);
  };

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your CoderCorps developer profile, visibility preferences, credentials, and notification settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 text-left border ${
              activeTab === "profile"
                ? "bg-primary/10 border-primary/20 text-white font-bold"
                : "border-transparent text-muted-foreground hover:bg-border/30 hover:text-white"
            }`}
          >
            <User className="h-4 w-4" />
            <span>Profile settings</span>
          </button>
          
          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 text-left border ${
              activeTab === "account"
                ? "bg-primary/10 border-primary/20 text-white font-bold"
                : "border-transparent text-muted-foreground hover:bg-border/30 hover:text-white"
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Account & Security</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 text-left border ${
              activeTab === "notifications"
                ? "bg-primary/10 border-primary/20 text-white font-bold"
                : "border-transparent text-muted-foreground hover:bg-border/30 hover:text-white"
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </button>
        </aside>

        {/* Form Content Cards */}
        <main className="lg:col-span-9">
          
          {/* 1. PROFILE TAB */}
          {activeTab === "profile" && (
            <Card className="glass border-border/40">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Developer Portfolio Credentials</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Update details shown on your public verified developer card.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4 font-sans">
                  {profileError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex items-start gap-2 animate-in fade-in duration-200">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  {/* Avatar Upload block */}
                  <div className="flex flex-col sm:flex-row gap-6 items-center p-4 bg-muted/40 border border-border/40 rounded-xl mb-6">
                    <div className="relative group flex-shrink-0">
                      <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-primary/40 bg-card flex items-center justify-center relative">
                        {avatarUrl ? (
                          <Image 
                            src={avatarUrl} 
                            alt="Preview" 
                            width={80}
                            height={80}
                            unoptimized
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <UserCircle className="h-12 w-12 text-muted-foreground" />
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-semibold cursor-pointer"
                        >
                          <Camera className="h-4 w-4 mb-1 text-indigo-400" />
                          <span>CHANGE</span>
                        </button>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                    <div className="flex-grow w-full space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground font-mono uppercase">Full Name</label>
                          <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Atul Sharma" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground font-mono uppercase">College / Alma Mater</label>
                          <Input value={college} onChange={e => setCollege(e.target.value)} placeholder="BITS Pilani" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground font-mono uppercase">Image URL (Optional)</label>
                        <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://unsplash.com/..." />
                      </div>
                    </div>
                  </div>

                  {/* Skills Comma Separated */}
                  <div className="space-y-1.5">
                    <label htmlFor="p_skills" className="text-xs font-semibold text-muted-foreground font-mono">CAPABILITIES / SKILLS (COMMA-SEPARATED)</label>
                    <Input id="p_skills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="FastAPI, Python, Next.js, Docker" />
                  </div>

                  {/* Bio Description */}
                  <div className="space-y-1.5">
                    <label htmlFor="p_bio" className="text-xs font-semibold text-muted-foreground font-mono">DEVELOPER BIO</label>
                    <textarea
                      id="p_bio"
                      rows={4}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Backend architect exploring distributed databases..."
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  {/* Social URLs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="p_github" className="text-xs font-semibold text-muted-foreground font-mono">GITHUB URL</label>
                      <Input id="p_github" type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="p_linkedin" className="text-xs font-semibold text-muted-foreground font-mono">LINKEDIN URL</label>
                      <Input id="p_linkedin" type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="p_resume" className="text-xs font-semibold text-muted-foreground font-mono">RESUME CLOUD URL</label>
                      <Input id="p_resume" type="url" value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} placeholder="https://drive.google.com/..." />
                    </div>
                  </div>

                  {/* Mentor Availability / Office Hours — only visible to mentors and admins */}
                  {(user.role === "mentor" || user.role === "admin") && (
                    <div className="space-y-1.5">
                      <label htmlFor="p_availability" className="text-xs font-semibold text-muted-foreground font-mono">OFFICE HOURS / AVAILABILITY <span className="text-indigo-400">(MENTOR ONLY)</span></label>
                      <textarea
                        id="p_availability"
                        rows={3}
                        value={availability}
                        onChange={e => setAvailability(e.target.value)}
                        placeholder="e.g. Mon–Fri 8–10 PM IST · Book a slot via LinkedIn DM"
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <p className="text-[10px] text-muted-foreground">Shown on the public Mentors page and your portfolio. Leave blank to hide.</p>
                    </div>
                  )}

                  {/* Public visibility toggle */}
                  <div className="p-4 bg-border/20 border border-border/40 rounded-xl flex items-center justify-between gap-4 mt-6">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase font-mono">Public Verified Card Visibility</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Allow recruiters to discover and verify your certificates publicly.</p>
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
                    <Button type="submit" disabled={profileLoading} className="font-semibold px-8">
                      {profileLoading ? "Saving..." : "Save Profile Details"}
                    </Button>
                    {profileSuccess && (
                      <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-in fade-in duration-200">
                        <ShieldCheck className="h-4 w-4" /> Profile Credentials Saved!
                      </span>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 2. ACCOUNT TAB */}
          {activeTab === "account" && (
            <Card className="glass border-border/40">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Security Credentials</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Update your account access credentials and update passwords.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAccountSubmit} className="space-y-4 font-sans">
                  {accountError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex items-start gap-2 animate-in fade-in duration-200">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{accountError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="acc_email" className="text-xs font-semibold text-muted-foreground font-mono">WORKSPACE EMAIL ADDRESS</label>
                    <Input id="acc_email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="atul@example.com" />
                  </div>

                  <div className="h-px bg-border/40 my-6" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="curr_pass" className="text-xs font-semibold text-muted-foreground font-mono">CURRENT PASSWORD</label>
                      <Input id="curr_pass" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="new_pass" className="text-xs font-semibold text-muted-foreground font-mono">NEW PASSWORD</label>
                      <Input id="new_pass" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <Button type="submit" disabled={accountLoading} className="font-semibold px-8">
                      {accountLoading ? "Updating..." : "Update Account Info"}
                    </Button>
                    {accountSuccess && (
                      <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-in fade-in duration-200">
                        <ShieldCheck className="h-4 w-4" /> Account Credentials Updated!
                      </span>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 3. NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <Card className="glass border-border/40">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Notification Dispatch Preferences</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Select which notification pathways you would like enabled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNotifSubmit} className="space-y-6 font-sans">
                  <div className="space-y-4">
                    {/* Toggle 1 */}
                    <div className="flex items-center justify-between gap-4 p-3 bg-muted/20 border border-border/30 rounded-lg">
                      <div>
                        <h4 className="text-xs font-bold text-foreground uppercase font-mono">Email review alerts</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Receive email notifications when a mentor audits your code or requests revisions.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifReviews(!notifReviews)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          notifReviews ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifReviews ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {/* Toggle 2 */}
                    <div className="flex items-center justify-between gap-4 p-3 bg-muted/20 border border-border/30 rounded-lg">
                      <div>
                        <h4 className="text-xs font-bold text-foreground uppercase font-mono">Sprint updates</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Receive alerts when new sprints are launched or tasks are reassigned.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifSprints(!notifSprints)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          notifSprints ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifSprints ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {/* Toggle 3 */}
                    <div className="flex items-center justify-between gap-4 p-3 bg-muted/20 border border-border/30 rounded-lg">
                      <div>
                        <h4 className="text-xs font-bold text-foreground uppercase font-mono">Weekly Digest</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">A digest detailing active community sprints and open issues system-wide.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifWeekly(!notifWeekly)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          notifWeekly ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifWeekly ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-border/40">
                    <Button type="submit" className="font-semibold px-8">
                      Save Alert Preferences
                    </Button>
                    {notifSuccess && (
                      <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 animate-in fade-in duration-200">
                        <ShieldCheck className="h-4 w-4" /> Notification Settings Updated!
                      </span>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

        </main>
      </div>
    </div>
  );
}
