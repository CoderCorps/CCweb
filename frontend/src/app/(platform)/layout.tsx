"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CommandPalette } from "@/components/ui/command-palette";
import { getAssetUrl } from "@/lib/utils";

import { 
  LayoutDashboard, 
  FolderGit2, 
  UserCircle, 
  ClipboardList, 
  LogOut, 
  Terminal,
  ChevronRight,
  Settings,
  Users
} from "lucide-react";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [cmdOpen, setCmdOpen] = useState(false);

  // Cmd+K / Ctrl+K global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Route Guard: redirect to login if user is guest
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Terminal className="h-8 w-8 text-primary animate-pulse" />
        <span className="text-sm font-mono text-muted-foreground animate-pulse">Waking up engine...</span>
      </div>
    );
  }

  if (!user) {
    return null; // will redirect in useEffect
  }

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { name: "Projects", href: "/projects", icon: <FolderGit2 className="h-4 w-4" /> },
    { name: "My Portfolio", href: "/portfolio", icon: <UserCircle className="h-4 w-4" /> },
    { name: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
  ];

  // Mentors get reviews and students links
  if (user.role === "mentor" || user.role === "admin") {
    navLinks.push({
      name: "Reviews Board",
      href: "/mentor/reviews",
      icon: <ClipboardList className="h-4 w-4" />
    });
    navLinks.push({
      name: "Students Roster",
      href: "/mentor/students",
      icon: <Users className="h-4 w-4" />
    });
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between fixed top-0 bottom-0 left-0 z-30">
        <div>
          {/* Brand header */}
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={32} height={32} className="object-contain" />
              <span className="font-bold text-lg text-foreground">Coder<span className="text-primary">Corps</span></span>
            </Link>
          </div>

          {/* User info widget */}
          <div className="p-4 border-b border-border/40 flex items-center gap-3">
            <Image 
              src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`} 
              alt={user.name} 
              width={40}
              height={40}
              className="rounded-full object-cover border border-border"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider">{user.role}</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="p-4 space-y-1.5">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link key={link.href} href={link.href}>
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active 
                      ? "bg-primary/10 border border-primary/20 text-white" 
                      : "text-muted-foreground hover:bg-border/30 hover:text-white border border-transparent"
                  }`}>
                    <div className="flex items-center gap-3">
                      {link.icon}
                      <span>{link.name}</span>
                    </div>
                    {active && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-border flex flex-col gap-2">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow pl-64 min-h-screen flex flex-col">
        {/* Top bar header */}
        <header className="h-16 border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 flex items-center justify-between px-8 z-20">
          <h2 className="text-sm font-semibold text-foreground font-mono uppercase tracking-wider">
            {pathname === "/dashboard" ? "ENGINEERING DASHBOARD" : pathname.startsWith("/projects") ? "LABS WORKSPACE" : pathname.startsWith("/portfolio") ? "MY PORTFOLIO" : "REVIEWS DASHBOARD"}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors border border-border/40 rounded px-2 py-1 bg-card/40 hover:bg-card/80"
              title="Open command palette"
            >
              <span>⌘K</span>
            </button>
            <span className="text-xs text-muted-foreground font-mono hidden sm:block">
              STATUS: <span className="text-emerald-400">ACTIVE</span>
            </span>
            <ThemeToggle />
          </div>
        </header>

        {/* Dynamic page contents */}
        <main className="flex-grow p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
