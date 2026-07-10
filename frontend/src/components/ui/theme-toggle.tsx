"use client";

import React from "react";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl border border-border/60 bg-card/60 hover:bg-border/40 text-muted-foreground hover:text-foreground transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Sun icon (light mode) */}
      <Sun
        className={`absolute h-4.5 w-4.5 transition-all duration-300 ${
          isDark
            ? "opacity-0 rotate-90 scale-50"
            : "opacity-100 rotate-0 scale-100 text-amber-500"
        }`}
      />
      {/* Moon icon (dark mode) */}
      <Moon
        className={`absolute h-4.5 w-4.5 transition-all duration-300 ${
          isDark
            ? "opacity-100 rotate-0 scale-100 text-indigo-400"
            : "opacity-0 -rotate-90 scale-50"
        }`}
      />
    </button>
  );
}
