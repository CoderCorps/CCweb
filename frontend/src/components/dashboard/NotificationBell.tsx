"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/stores";
import { Bell, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } =
    useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds using the store (store handles deduplication)
    const interval = setInterval(fetchNotifications, 30_000);

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [fetchNotifications]);

  const handleNotificationClick = async (notif: typeof notifications[0]) => {
    setIsOpen(false);
    if (!notif.read_at) {
      await markRead(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative h-9 w-9 text-muted-foreground hover:text-white bg-card/40 hover:bg-card/85 border border-border/40"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white font-mono animate-bounce">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-hidden glass-premium rounded-xl border border-border/60 shadow-2xl flex flex-col z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/30 flex justify-between items-center bg-card/40">
            <span className="text-xs font-extrabold text-white font-mono uppercase tracking-wider">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold font-sans flex items-center gap-0.5"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-black/10 py-1 divide-y divide-border/20">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const isUnread = notif.read_at === null;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-4 py-3 flex gap-3 items-start cursor-pointer hover:bg-card/30 transition-colors ${
                      isUnread ? "bg-indigo-500/5" : ""
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      {isUnread ? (
                        <Circle className="h-2 w-2 fill-indigo-500 text-indigo-500" />
                      ) : (
                        <div className="h-2 w-2" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-xs leading-relaxed ${isUnread ? "text-white font-semibold" : "text-slate-300"}`}>
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-muted-foreground font-mono block">
                        {new Date(notif.created_at).toLocaleDateString()}{" "}
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Bell className="h-6 w-6 text-border/60" />
                <p className="text-xs">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
