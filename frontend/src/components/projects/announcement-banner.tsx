"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Megaphone, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AnnouncementBannerProps {
  projectId: number;
}

export function AnnouncementBanner({ projectId }: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, [projectId]);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/announcements`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      console.error("Failed to fetch announcements", err);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/announcements/${id}/read`, {});
      // Optimistic update
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  if (announcements.length === 0 || dismissed) return null;

  const unreadCount = announcements.filter(a => !a.is_read).length;
  const displayList = expanded ? announcements : announcements.slice(0, 1);

  return (
    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6 overflow-hidden">
      <div className="p-3 bg-indigo-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-300">
          <Megaphone className="h-4 w-4" />
          <span className="font-semibold text-sm">
            Project Announcements
            {unreadCount > 0 && (
              <span className="ml-2 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {unreadCount} Unread
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {announcements.length > 1 && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-indigo-400 hover:text-indigo-300 p-1"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button 
            onClick={() => setDismissed(true)}
            className="text-indigo-400 hover:text-indigo-300 p-1 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-indigo-500/10">
        {displayList.map((ann) => (
          <div key={ann.id} className="p-4 flex gap-4 items-start relative">
            {!ann.is_read && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r" />
            )}
            <div className="flex-1">
              <p className="text-sm text-slate-200">{ann.content}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-indigo-400/70">
                  {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                </span>
                {!ann.is_read && (
                  <button 
                    onClick={() => markAsRead(ann.id)}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded"
                  >
                    <Check className="h-3 w-3" /> Mark Read
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {announcements.length > 1 && !expanded && (
        <div 
          onClick={() => setExpanded(true)}
          className="bg-indigo-500/5 hover:bg-indigo-500/10 text-center py-2 text-[10px] font-mono text-indigo-400/80 cursor-pointer transition-colors"
        >
          SHOW {announcements.length - 1} MORE ANNOUNCEMENTS
        </div>
      )}
    </div>
  );
}
