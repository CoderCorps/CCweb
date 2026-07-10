"use client";

import React, { useState, Suspense, lazy } from "react";

// Lazy load the Spline component to prevent blocking the initial document paint
const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  sceneUrl: string;
  className?: string;
  fallbackImage?: string;
}

export function SplineScene({ 
  sceneUrl, 
  className = "", 
  fallbackImage 
}: SplineSceneProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden w-full h-full min-h-[350px] flex items-center justify-center ${className}`}>
      {/* Loading Skeleton */}
      {loading && (
        <div className="absolute inset-0 bg-card/40 border border-border/40 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 animate-pulse z-10">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">LOADING 3D ENGINE...</span>
        </div>
      )}

      {/* Error Fallback */}
      {error && fallbackImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center rounded-2xl border border-border/40"
          style={{ backgroundImage: `url(${fallbackImage})` }}
        />
      )}

      <Suspense fallback={null}>
        <Spline 
          scene={sceneUrl}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          className="w-full h-full object-cover"
        />
      </Suspense>
    </div>
  );
}
