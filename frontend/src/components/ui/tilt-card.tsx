"use client";

import React, { useRef, useState } from "react";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxRotation?: number; // Maximum rotation in degrees
  perspective?: number; // Perspective depth in pixels
  scale?: number; // Scale on hover
}

export function TiltCard({
  children,
  className = "",
  maxRotation = 12,
  perspective = 800,
  scale = 1.02,
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [shineX, setShineX] = useState(50);
  const [shineY, setShineY] = useState(50);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate relative mouse position (0 to 1) inside the card
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse coordinates to shine percentage positions
    setShineX((mouseX / width) * 100);
    setShineY((mouseY / height) * 100);

    // Convert to values from -0.5 to 0.5
    const normalizedX = mouseX / width - 0.5;
    const normalizedY = mouseY / height - 0.5;

    // Calculate rotation angles (invert X rotation for realistic tilting)
    setRotateX(-normalizedY * maxRotation);
    setRotateY(normalizedX * maxRotation);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setShineX(50);
    setShineY(50);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${className}`}
      style={{
        transformStyle: "preserve-3d",
        perspective: `${perspective}px`,
        transform: isHovered 
          ? `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`
          : `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`,
        transition: isHovered ? "transform 0.05s ease-out" : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
      {...props}
    >
      {/* 3D Content wrapper */}
      <div className="relative z-10 w-full h-full" style={{ transform: "translateZ(30px)" }}>
        {children}
      </div>

      {/* Holographic light reflect / shine overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay transition-opacity duration-300"
        style={{
          opacity: isHovered ? 0.35 : 0,
          background: `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 55%)`,
          transition: isHovered ? "background 0.05s ease-out, opacity 0.3s ease" : "opacity 0.5s ease",
        }}
      />
    </div>
  );
}
