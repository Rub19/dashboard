"use client";

import { useId } from "react";

type FocusTimerRingProps = {
  progress: number;
  remaining: string;
  label: string;
  size?: number;
};

export default function FocusTimerRing({ progress, remaining, label, size = 288 }: FocusTimerRingProps) {
  const stroke = 6;
  const radius = 45;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(progress, 0), 1) * circumference);
  const gradientId = useId();

  return (
    <div
      className="relative mx-auto my-6 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-color, #10b981)" />
            <stop offset="100%" stopColor="var(--accent-soft, #34d399)" />
          </linearGradient>
        </defs>
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: "drop-shadow(0 0 12px var(--accent-glow, rgba(16, 185, 129, 0.4)))",
            transition: "stroke-dashoffset 1s linear",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-5xl font-bold font-mono tracking-tight text-white sm:text-6xl">
          {remaining}
        </p>
        <span className="mt-2 inline-flex items-center rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {label}
        </span>
      </div>
    </div>
  );
}
