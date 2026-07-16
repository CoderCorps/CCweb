import React from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeData {
  id: number;
  name: string;
  description: string;
  image_url: string;
  criteria_type: string;
  criteria_value: number;
}

interface UserBadge {
  id: number;
  user_id: number;
  badge_id: number;
  earned_at: string;
  badge: BadgeData;
}

interface BadgeTooltipProps {
  userBadge: UserBadge;
}

export function BadgeTooltip({ userBadge }: BadgeTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative group cursor-pointer w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center bg-card/40 border border-border/50 hover:border-primary/50 hover:bg-card/80 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden">
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">
              {/* Fallback rendering if no real image exists */}
              <Image 
                src={userBadge.badge.image_url.startsWith('/') ? userBadge.badge.image_url : `/assets/badges/${userBadge.badge.image_url}`} 
                alt={userBadge.badge.name}
                fill
                className="object-contain drop-shadow-md"
                unoptimized
              />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-200 text-center px-2 line-clamp-1 leading-tight w-full truncate">
              {userBadge.badge.name}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="glass-premium border-border/60 p-3 max-w-xs shadow-xl rounded-xl">
          <div className="space-y-1.5">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              {userBadge.badge.name}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {userBadge.badge.description}
            </p>
            <div className="pt-2 mt-2 border-t border-border/40 flex justify-between items-center text-[10px] font-mono text-indigo-300">
              <span>UNLOCKED</span>
              <span>{format(new Date(userBadge.earned_at), "MMM d, yyyy")}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
