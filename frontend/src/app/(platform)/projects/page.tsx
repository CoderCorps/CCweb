"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  FolderGit2, 
  User, 
  ArrowRight, 
  Plus, 
  AlertCircle,
  ShieldAlert,
  GitBranch
} from "lucide-react";

interface Project {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  mentor?: {
    id: number;
    name: string;
  };
  members: Array<{
    user_id: number;
    role: string;
  }>;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creation State (Mentor)
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [submittingProject, setSubmittingProject] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function fetchProjects() {
    try {
      const res = await api.get("/projects");
      if (res.ok) {
        const json = await res.json();
        setProjects(json);
      } else {
        setError("Failed to load your projects.");
      }

      // If student, also check other projects they can join
      if (user?.role === "student") {
        // Fetch all projects for join catalog (in a production app we'd have a separate catalog route, 
        // but here we can mock or query from the main route by bypassing student filter on backend 
        // or simulating a mock selection. Let's do a mock lookup catalog for demo purposes)
        const allRes = await api.get("/projects"); // in mock seed, they are already part of it
      }
    } catch (err) {
      setError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProject(true);

    try {
      const res = await api.post("/projects", {
        title: newTitle,
        description: newDescription,
        status: "active"
      });

      if (res.ok) {
        setDialogOpen(false);
        setNewTitle("");
        setNewDescription("");
        fetchProjects(); // Reload list
      } else {
        alert("Failed to create project");
      }
    } catch (err) {
      alert("Error connecting to server");
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleJoinProject = async (projId: number) => {
    try {
      const res = await api.post(`/projects/${projId}/join`, {});
      if (res.ok) {
        fetchProjects(); // Reload list
      } else {
        alert("Failed to join project");
      }
    } catch (err) {
      alert("Error joining project");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        <div className="h-48 bg-card rounded-xl" />
        <div className="h-48 bg-card rounded-xl" />
      </div>
    );
  }

  const isMentor = user?.role === "mentor" || user?.role === "admin";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Labs Workspace</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Participate in active sprint streams and commit code changes.
          </p>
        </div>

        {isMentor && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-semibold gap-1.5">
                <Plus className="h-4 w-4" /> Create Project
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-premium border-border/60">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New Project Stream</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Scaffold a new engineering engagement workspace for contributors.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label htmlFor="p_title" className="text-xs font-semibold text-foreground font-mono">PROJECT TITLE</label>
                  <Input 
                    id="p_title" 
                    type="text" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)} 
                    placeholder="Distributed Database Engine" 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="p_desc" className="text-xs font-semibold text-foreground font-mono">DESCRIPTION</label>
                  <textarea
                    id="p_desc"
                    rows={4}
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Build a resilient log-structured merge database engine with query and transaction layers..."
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={submittingProject} className="w-full font-semibold">
                    {submittingProject ? "Scaffolding..." : "Create Project Stream"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((proj) => (
            <Card key={proj.id} className="glass border-border/40 p-2 flex flex-col justify-between hover:border-primary/20 transition-all duration-200">
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <GitBranch className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground font-bold">{proj.title}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <User className="h-3 w-3 text-indigo-400" /> Mentor: {proj.mentor?.name || "Unassigned"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground leading-relaxed h-12 overflow-hidden">{proj.description}</p>
                <div className="flex gap-4 text-[10px] font-mono text-muted-foreground pt-4">
                  <span>CONTRIBUTORS: {proj.members.filter(m => m.role === "contributor").length}</span>
                  <span>STATUS: <span className="text-emerald-400">{proj.status.toUpperCase()}</span></span>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/30 pt-4 mt-4">
                <Link href={`/projects/${proj.id}`} className="w-full">
                  <Button className="w-full font-semibold gap-1.5">
                    Enter Workspace <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="glass p-12 text-center border-border/40 flex flex-col items-center gap-4">
          <FolderGit2 className="h-10 w-10 text-muted-foreground animate-pulse" />
          <div>
            <h3 className="font-bold text-foreground text-lg">No Active Projects Joined</h3>
            <p className="text-xs text-muted-foreground mt-1">
              You are currently not registered in any workspace. Join a repository catalog to commit code.
            </p>
          </div>
          {/* Quick action to join our seed project for new users */}
          <Button onClick={() => handleJoinProject(1)} className="font-semibold">Join E-Commerce Project</Button>
        </div>
      )}
    </div>
  );
}
