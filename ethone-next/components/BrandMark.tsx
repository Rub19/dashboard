"use client";

import { useId } from "react";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

export default function BrandMark({ size = 40, className = "" }: BrandMarkProps) {
  const surfaceId = useId();
  const signalId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="ETHONE"
      className={className}
    >
      <defs>
        <linearGradient id={surfaceId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14191f" />
          <stop offset="1" stopColor="#080a0d" />
        </linearGradient>
        <linearGradient id={signalId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7be5c3" />
          <stop offset="1" stopColor="#8bc9fa" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="18" fill={`url(#${signalId})`} />
      <rect x="8" y="8" width="48" height="48" rx="14" fill={`url(#${surfaceId})`} />
      <path
        d="M22 21v22m0-22h20M22 32h15M22 43h20"
        fill="none"
        stroke="#f4f7fa"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
