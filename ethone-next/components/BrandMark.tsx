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
      shapeRendering="geometricPrecision"
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
      <rect x="1.5" y="1.5" width="61" height="61" rx="18" fill={`url(#${signalId})`} />
      <rect x="5.5" y="5.5" width="53" height="53" rx="15" fill={`url(#${surfaceId})`} />
      <path
        d="M20 19v26m0-26h24M20 32h18M20 45h24"
        fill="none"
        stroke="#f4f7fa"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
