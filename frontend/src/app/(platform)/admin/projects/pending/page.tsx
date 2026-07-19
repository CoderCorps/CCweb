"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderGit2, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function PendingProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchProjects = async () => {
    try {
      const res = await api.get("/admin/projects/pending");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load pending projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchProjects();
    }
  }, [user]);

  const handleApprove = async (id: number) => {
    try {
      const res = await api.post(`/admin/projects/${id}/approve`, {});
      if (res.ok) {
        alert("Project approved!");
        setProjects(projects.filter(p => p.id !== id));
      } else {
        alert("Failed to approve project");
      }
    } catch (err) {
      alert("Error approving project");
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    try {
      const res = await api.post(`/admin/projects/${id}/reject`, { reason: rejectReason });
      if (res.ok) {
        alert("Project rejected");
        setProjects(projects.filter(p => p.id !== id));
        setRejectingId(null);
        setRejectReason("");
      } else {
        alert("Failed to reject project");
      }
    } catch (err) {
      alert("Error rejecting project");
    }
  };

  if (user?.role !== "admin") return <div className="p-8">Not authorized</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pending Project Approvals</h1>
        <p className="text-muted-foreground mt-2">
          Review new project submissions from mentors before they go live for students.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-pulse flex items-center gap-2"><FolderGit2 className="h-5 w-5" /> Loading...</div></div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground text-center">
            <CheckCircle className="h-12 w-12 mb-4 text-primary/40" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">There are no pending project submissions right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Submitted by <span className="font-medium text-foreground">{project.mentor?.name}</span> on {new Date(project.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Link href={`/projects/${project.id}/approval-thread`}>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Discuss with Mentor
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose dark:prose-invert max-w-none">
                  <h3>Project Description</h3>
                  <p>{project.description}</p>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t flex gap-3 p-4">
                {rejectingId === project.id ? (
                  <div className="w-full flex flex-col gap-3">
                    <textarea 
                      placeholder="Reason for rejection (will be sent to mentor)..." 
                      value={rejectReason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Button>
                      <Button variant="destructive" onClick={() => handleReject(project.id)}>Confirm Reject</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 ml-auto">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setRejectingId(project.id)}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleApprove(project.id)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Project
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
