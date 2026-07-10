"use client";
import React from "react";
import Image from "next/image";

interface GitHubGraphProps {
  github_url?: string | null;
  name?: string;
}

function extractGitHubUsername(url: string): string | null {
  try {
    // Handle: https://github.com/username or https://github.com/username/
    const match = url.match(/github\.com\/([^/?#]+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function GitHubGraph({ github_url, name }: GitHubGraphProps) {
  if (!github_url) return null;

  const username = extractGitHubUsername(github_url);
  if (!username) return null;

  return (
    <div className="glass border border-border/40 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">
          GitHub Contributions
        </h3>
        <a
          href={github_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-mono transition-colors"
        >
          @{username} ↗
        </a>
      </div>
      <div className="overflow-x-auto rounded-lg">
        <Image
          src={`https://ghchart.rshah.org/6366f1/${username}`}
          alt={`${name || username}'s GitHub contribution graph`}
          width={722}
          height={112}
          unoptimized
          className="w-full h-auto rounded opacity-90 hover:opacity-100 transition-opacity"
          onError={(e) => {
            // Hide parent if the chart fails to load
            const parent = (e.target as HTMLElement).closest("[data-github-graph]");
            if (parent) (parent as HTMLElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
}
