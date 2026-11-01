"use client";

import React, { useState } from "react";
import { Copy, Check, FileCode, ChevronDown, ChevronRight } from "lucide-react";

interface CodeDiffViewerProps {
  filename: string;
  diffText: string;
  defaultExpanded?: boolean;
}

export function CodeDiffViewer({
  filename,
  diffText,
  defaultExpanded = true,
}: CodeDiffViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const lines = diffText.trim().split("\n");

  let additions = 0;
  let deletions = 0;
  lines.forEach((line) => {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let oldLineNum = 1;
  let newLineNum = 1;

  return (
    <div className="rounded-xl border border-border/60 bg-slate-950/90 overflow-hidden font-mono text-xs shadow-lg">
      {/* Diff File Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-border/40 select-none">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-slate-200 hover:text-white font-bold transition-colors cursor-pointer text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-indigo-400 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0" />
          )}
          <FileCode className="h-4 w-4 text-indigo-400 shrink-0" />
          <span className="truncate max-w-[240px] sm:max-w-md">{filename}</span>
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="text-emerald-400 font-mono">+{additions}</span>
            <span className="text-rose-400 font-mono">-{deletions}</span>
          </div>

          <button
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Copy diff to clipboard"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Diff Lines Table */}
      {expanded && (
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse select-text">
            <tbody>
              {lines.map((line, idx) => {
                const isHunkHeader = line.startsWith("@@");
                const isAddition = line.startsWith("+") && !line.startsWith("+++");
                const isDeletion = line.startsWith("-") && !line.startsWith("---");

                let displayOld = "";
                let displayNew = "";

                if (isHunkHeader) {
                  const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                  if (match) {
                    oldLineNum = parseInt(match[1], 10);
                    newLineNum = parseInt(match[2], 10);
                  }
                } else if (isAddition) {
                  displayNew = String(newLineNum++);
                } else if (isDeletion) {
                  displayOld = String(oldLineNum++);
                } else {
                  displayOld = String(oldLineNum++);
                  displayNew = String(newLineNum++);
                }

                return (
                  <tr
                    key={idx}
                    className={`leading-relaxed transition-colors ${
                      isHunkHeader
                        ? "bg-indigo-950/40 text-indigo-300 font-bold"
                        : isAddition
                        ? "bg-emerald-500/15 text-emerald-200"
                        : isDeletion
                        ? "bg-rose-500/15 text-rose-200"
                        : "text-slate-400 hover:bg-slate-900/40"
                    }`}
                  >
                    {/* Line numbers */}
                    <td className="w-10 px-2 py-0.5 text-[10px] text-right text-slate-600 select-none border-r border-slate-800">
                      {isHunkHeader ? "..." : displayOld}
                    </td>
                    <td className="w-10 px-2 py-0.5 text-[10px] text-right text-slate-600 select-none border-r border-slate-800">
                      {isHunkHeader ? "..." : displayNew}
                    </td>

                    {/* Diff indicator sign */}
                    <td className="w-6 px-1 py-0.5 text-center font-bold select-none">
                      {isAddition ? "+" : isDeletion ? "-" : " "}
                    </td>

                    {/* Diff content line */}
                    <td className="px-3 py-0.5 font-mono whitespace-pre text-[11px] break-all">
                      {line.startsWith("+") || line.startsWith("-")
                        ? line.slice(1)
                        : line}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
