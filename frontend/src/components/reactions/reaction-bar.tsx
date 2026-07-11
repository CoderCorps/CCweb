"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SmilePlus } from "lucide-react";

interface ReactionBarProps {
  targetType: "message" | "report" | "comment";
  targetId: number;
}

export function ReactionBar({ targetType, targetId }: ReactionBarProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);

  // Hardcode some common emojis for the picker
  const EMOJI_OPTIONS = ["👍", "🚀", "🔥", "💯", "👀", "🙌"];

  useEffect(() => {
    fetchReactions();
  }, [targetType, targetId]);

  const fetchReactions = async () => {
    try {
      const res = await api.get(`/reactions?target_type=${targetType}&target_id=${targetId}`);
      if (res.ok) {
        const data = await res.json();
        // data should be an array of reactions. We need to aggregate them.
        const counts: Record<string, number> = {};
        const userReacted = new Set<string>();

        data.forEach((r: any) => {
          counts[r.emoji] = (counts[r.emoji] || 0) + 1;
          if (r.user_id === user?.id) {
            userReacted.add(r.emoji);
          }
        });

        setReactions(counts);
        setUserReactions(userReacted);
      }
    } catch (err) {
      console.error("Failed to fetch reactions", err);
    }
  };

  const toggleReaction = async (emoji: string) => {
    try {
      // Optimistic update
      const wasReacted = userReactions.has(emoji);
      setUserReactions(prev => {
        const next = new Set(prev);
        if (wasReacted) next.delete(emoji);
        else next.add(emoji);
        return next;
      });
      setReactions(prev => {
        const count = prev[emoji] || 0;
        return { ...prev, [emoji]: wasReacted ? Math.max(0, count - 1) : count + 1 };
      });

      const res = await api.post("/reactions", {
        target_type: targetType,
        target_id: targetId,
        emoji
      });
      
      if (!res.ok) {
        // Revert on failure
        fetchReactions();
      }
      setShowPicker(false);
    } catch (err) {
      console.error("Failed to toggle reaction", err);
      fetchReactions();
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-1 mt-1">
      {Object.entries(reactions).map(([emoji, count]) => {
        if (count === 0) return null;
        const hasReacted = userReactions.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
              hasReacted 
                ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" 
                : "bg-black/20 border-border/40 text-slate-400 hover:bg-card hover:text-slate-300"
            }`}
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </button>
        );
      })}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center justify-center h-5 w-5 rounded-full border border-border/40 bg-black/20 text-slate-400 hover:text-indigo-400 hover:bg-card transition-colors"
        >
          <SmilePlus className="h-3 w-3" />
        </button>

        {showPicker && (
          <div className="absolute z-10 bottom-full left-0 mb-1 flex bg-card/95 backdrop-blur border border-border/40 rounded-full shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100">
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className="h-6 w-6 text-xs flex items-center justify-center hover:bg-black/20 rounded-full transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
