"use client";

import { motion } from "framer-motion";

export default function LoginEight({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg viewBox="0 0 120 160" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="eightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.4" />
          </linearGradient>
          <filter id="eightGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <motion.path
          d="M60 24 C 32 24, 18 44, 18 66 C 18 86, 34 96, 50 100 C 32 106, 14 122, 14 142 C 14 162, 34 170, 60 170 C 86 170, 106 162, 106 142 C 106 122, 88 106, 70 100 C 86 96, 102 86, 102 66 C 102 44, 88 24, 60 24 Z M 60 52 C 72 52, 80 60, 80 72 C 80 84, 72 92, 60 92 C 48 92, 40 84, 40 72 C 40 60, 48 52, 60 52 Z M 60 112 C 76 112, 86 124, 86 140 C 86 156, 76 168, 60 168 C 44 168, 34 156, 34 140 C 34 124, 44 112, 60 112 Z"
          fill="none"
          stroke="url(#eightGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#eightGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 2.2, ease: "easeInOut", repeat: Infinity, repeatType: "loop" },
            opacity: { duration: 0.4 },
          }}
        />

        <motion.circle
          cx="60"
          cy="36"
          r="5"
          fill="var(--accent)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: [0, -10, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.circle
          cx="60"
          cy="36"
          r="8"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.6, 0.8] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 blur-2xl">
        <svg viewBox="0 0 120 160" className="h-full w-full">
          <path
            d="M60 24 C 88 24, 102 44, 102 66 C 102 86, 86 96, 70 100 C 88 106, 106 122, 106 142 C 106 162, 86 170, 60 170 C 34 170, 14 162, 14 142 C 14 122, 32 106, 50 100 C 34 96, 18 86, 18 66 C 18 44, 32 24, 60 24 Z"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="14"
            opacity="0.25"
          />
        </svg>
      </div>
    </div>
  );
}
