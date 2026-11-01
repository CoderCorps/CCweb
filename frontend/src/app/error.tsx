"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center font-sans px-6 py-12">
      <div className="max-w-md w-full mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error crashed this view. Our team has been notified.
            You can try reloading or heading back to the homepage.
          </p>
        </div>

        {error.digest && (
          <p className="text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded-lg px-3 py-2">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={reset}
            className="inline-flex items-center gap-2 font-semibold"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
