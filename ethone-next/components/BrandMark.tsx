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
      <rect x="1.25" y="1.25" width="61.5" height="61.5" rx="0" fill={`url(#${signalId})`} />
      <rect x="4.15" y="4.15" width="55.7" height="55.7" rx="0" fill={`url(#${surfaceId})`} />
      <path
        d="M19 18v28m0-28h26M19 32h20.5M19 46h26"
        fill="none"
        stroke="#f4f7fa"
        strokeWidth="6.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
