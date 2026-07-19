"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link2, Trash2, Plus, ExternalLink, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Resource {
  id: number;
  title: string;
  url: string;
  resource_type: string;
  created_at: string;
  mentor_only: boolean;
  mentor_id?: number;
}

interface ResourcesTabProps {
  projectId: number;
}

export function ResourcesTab({ projectId }: ResourcesTabProps) {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State (Mentor only)
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("link");
  const [mentorOnly, setMentorOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isMentor = user?.role === "mentor" || user?.role === "admin";

  useEffect(() => {
    fetchResources();
  }, [projectId]);

  const fetchResources = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/resources`);
      if (res.ok) {
        setResources(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch resources", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await api.post(`/projects/${projectId}/resources`, {
        title: title.trim(),
        url: url.trim(),
        resource_type: type,
        mentor_only: mentorOnly
      });
      if (res.ok) {
        setTitle("");
        setUrl("");
        setMentorOnly(false);
        fetchResources();
      } else {
        toast.error("Failed to add resource");
      }
    } catch (err) {
      console.error("Error adding resource", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResource = async (id: number) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      const res = await api.delete(`/projects/${projectId}/resources/${id}`);
      if (res.ok) {
        fetchResources();
      } else {
        toast.error("Failed to delete resource");
      }
    } catch (err) {
      console.error("Error deleting resource", err);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-40 bg-card rounded-xl"></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle className="text-white text-md flex items-center gap-2">
            <Link2 className="h-4 w-4 text-indigo-400" /> Project Resources
          </CardTitle>
          <CardDescription className="text-xs">
            Helpful links, documentation, and external resources for this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map(resource => (
                <div key={resource.id} className="p-4 bg-card/40 border border-border/40 rounded-xl flex items-start justify-between gap-3 group hover:border-indigo-500/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="font-bold text-sm text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5"
                      >
                        {resource.title} <ExternalLink className="h-3 w-3" />
                      </a>
                      {resource.mentor_only && (
                        <span className="flex items-center gap-0.5 text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 rounded font-mono uppercase">
                          <ShieldCheck className="h-2.5 w-2.5" /> Mentor
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      <span className="uppercase">{resource.resource_type}</span> • Added {formatDistanceToNow(new Date(resource.created_at.endsWith('Z') ? resource.created_at : resource.created_at + 'Z'), { addSuffix: true })}
                    </div>
                  </div>
                  
                  {isMentor && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteResource(resource.id)}
                      className="h-6 w-6 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No resources have been added to this project yet.</p>
          )}

          {isMentor && (
            <div className="pt-4 border-t border-border/20 mt-4">
              <h5 className="text-[10px] font-bold text-slate-400 font-mono uppercase mb-3">Add New Resource</h5>
              <form onSubmit={handleCreateResource} className="space-y-3 p-4 bg-card/20 rounded-xl border border-border/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono">TITLE</label>
                    <Input 
                      required value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. System Design Spec"
                      className="h-8 text-xs bg-black/20 border-border/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono">URL</label>
                    <Input 
                      required type="url" value={url} onChange={e => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-xs bg-black/20 border-border/60"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 font-mono block">TYPE</label>
                      <select 
                        value={type} onChange={e => setType(e.target.value)}
                        className="h-7 text-[11px] rounded bg-card border border-border/60 px-2"
                      >
                        <option value="link">Link</option>
                        <option value="doc">Document</option>
                        <option value="video">Video</option>
                        <option value="tool">Tool</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 mt-4 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={mentorOnly} onChange={e => setMentorOnly(e.target.checked)}
                        className="rounded border-border/60 bg-black/20 text-indigo-600 focus:ring-0 focus:ring-offset-0 h-3 w-3"
                      />
                      <span className="text-[10px] text-slate-300 font-mono">MENTOR ONLY</span>
                    </label>
                  </div>
                  
                  <Button type="submit" disabled={submitting} className="h-8 text-xs font-semibold gap-1 mt-4">
                    <Plus className="h-3.5 w-3.5" /> Add Resource
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
