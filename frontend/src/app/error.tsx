"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#09090b] text-white flex items-center justify-center font-sans antialiased">
        <div className="max-w-md w-full mx-auto px-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">
              Something went wrong
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              An unexpected error crashed this page. Our team has been notified.
              You can try reloading or heading back to the homepage.
            </p>
          </div>

          {error.digest && (
            <p className="text-[10px] font-mono text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-semibold hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Home className="h-4 w-4" />
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
