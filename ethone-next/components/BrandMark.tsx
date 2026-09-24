"use client";

import { useId } from "react";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

export default function BrandMark({ size = 40, className = "" }: BrandMarkProps) {
  const surfaceId = useId();
  const signalId = useId();
  const glowId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="ETHONE OS"
      className={className}
      style={{ shapeRendering: "geometricPrecision" }}
    >
      <defs>
        <linearGradient id={surfaceId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#181822" />
          <stop offset="50%" stopColor="#101018" />
          <stop offset="100%" stopColor="#08080c" />
        </linearGradient>
        <linearGradient id={signalId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8b5cf6" floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Outer Glow & Gradient Border */}
      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${signalId})`} filter={`url(#${glowId})`} />
      {/* Inner Deep Surface */}
      <rect x="3.5" y="3.5" width="57" height="57" rx="16.5" fill={`url(#${surfaceId})`} />
      {/* Top Glass Highlight */}
      <path
        d="M6 18C6 11.3726 11.3726 6 18 6H46C52.6274 6 58 11.3726 58 18V24C58 24 43 28 32 28C21 28 6 24 6 24V18Z"
        fill="white"
        fillOpacity="0.04"
      />
      {/* ETHONE Monogram 'E' with geometric precision */}
      <path
        d="M21 19v26m0-26h22M21 32h16M21 45h22"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
