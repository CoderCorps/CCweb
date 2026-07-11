"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface TaskCommentsProps {
  taskId: number;
  projectMentorId?: number;
}

export function TaskComments({ taskId, projectMentorId }: TaskCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      fetchComments();
    }
  }, [expanded, taskId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await api.post(`/tasks/${taskId}/comments`, { content: newComment });
      if (res.ok) {
        const data = await res.json();
        // Optimistic update assumes we get the full user object, but we fetch to be safe
        fetchComments(); 
        setNewComment("");
      }
    } catch (err) {
      console.error("Failed to post comment", err);
    }
  };

  const deleteComment = async (commentId: number) => {
    try {
      const res = await api.delete(`/task-comments/${commentId}`);
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  };

  const isMentor = user?.role === "mentor" && projectMentorId === user?.id;
  const isAdmin = user?.role === "admin";

  return (
    <div className="mt-6 border-t border-border/50 pt-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        Task Discussion {comments.length > 0 && `(${comments.length})`}
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No comments yet. Start the discussion!</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 bg-muted/30 p-3 rounded-lg border border-border/30">
                  <img 
                    src={comment.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.user?.name || "U")}`} 
                    alt={comment.user?.name} 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{comment.user?.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {(comment.user_id === user?.id || isMentor || isAdmin) && (
                        <button 
                          onClick={() => deleteComment(comment.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm mt-1 break-words whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addComment} className="flex gap-2 mt-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-background"
            />
            <Button type="submit" size="sm" disabled={!newComment.trim()}>Post</Button>
          </form>
        </div>
      )}
    </div>
  );
}
