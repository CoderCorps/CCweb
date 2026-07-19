"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";

export default function PendingMentorsPage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchMentors = async () => {
    try {
      const res = await api.get("/admin/mentors/pending");
      if (res.ok) {
        const data = await res.json();
        setMentors(data);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load pending mentors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchMentors();
    }
  }, [user]);

  const handleApprove = async (id: number) => {
    try {
      const res = await api.post(`/admin/mentors/${id}/approve`, {});
      if (res.ok) {
        alert("Mentor approved!");
        setMentors(mentors.filter(m => m.id !== id));
      } else {
        alert("Failed to approve mentor");
      }
    } catch (err) {
      alert("Error approving mentor");
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    try {
      const res = await api.post(`/admin/mentors/${id}/reject`, { reason: rejectReason });
      if (res.ok) {
        alert("Mentor rejected");
        setMentors(mentors.filter(m => m.id !== id));
        setRejectingId(null);
        setRejectReason("");
      } else {
        alert("Failed to reject mentor");
      }
    } catch (err) {
      alert("Error rejecting mentor");
    }
  };

  if (user?.role !== "admin") return <div className="p-8">Not authorized</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pending Mentor Approvals</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve or reject new mentor applications.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-pulse flex items-center gap-2"><UserCircle className="h-5 w-5" /> Loading...</div></div>
      ) : mentors.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground text-center">
            <CheckCircle className="h-12 w-12 mb-4 text-primary/40" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">There are no pending mentor applications right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {mentors.map((mentor) => (
            <Card key={mentor.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <Image 
                      src={mentor.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mentor.name)}`}
                      alt={mentor.name}
                      width={48}
                      height={48}
                      className="rounded-full border"
                    />
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {mentor.name}
                        {mentor.last_reminder_sent_at && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                            Reminder Sent
                          </span>
                        )}
                        {!mentor.last_reminder_sent_at && mentor.created_at && (new Date().getTime() - new Date(mentor.created_at + "Z").getTime() > 24 * 60 * 60 * 1000) && (
                          <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold animate-pulse">
                            Waiting 24h+
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>{mentor.email}</CardDescription>
                    </div>
                  </div>
                  {mentor.last_reminder_sent_at && (
                    <div className="text-xs text-right text-muted-foreground">
                      <p>Reminded:</p>
                      <p className="font-mono">{new Date(mentor.last_reminder_sent_at + "Z").toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-muted-foreground">College / Organization</p>
                    <p>{mentor.profile?.college || "N/A"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Joined</p>
                    <p>{new Date(mentor.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold text-muted-foreground">Bio</p>
                    <p className="bg-muted/50 p-3 rounded-md mt-1">{mentor.profile?.bio || "No bio provided."}</p>
                  </div>
                  {mentor.profile?.skills?.length > 0 && (
                    <div className="col-span-2">
                      <p className="font-semibold text-muted-foreground mb-1">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {mentor.profile.skills.map((skill: string) => (
                          <span key={skill} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t flex gap-3 p-4">
                {rejectingId === mentor.id ? (
                  <div className="w-full flex flex-col gap-3">
                    <textarea 
                      placeholder="Reason for rejection..." 
                      value={rejectReason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Button>
                      <Button variant="destructive" onClick={() => handleReject(mentor.id)}>Confirm Reject</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 ml-auto">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setRejectingId(mentor.id)}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleApprove(mentor.id)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Mentor
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
