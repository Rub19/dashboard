"use client";

import { motion } from "framer-motion";

export default function LoginEight({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg viewBox="0 0 120 160" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="eightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accent-secondary, #a78bfa)" stopOpacity="1" />
          </linearGradient>
          <filter id="eightGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <motion.path
          d="M60 20 C 90 20, 100 45, 100 65 C 100 80, 90 90, 75 95 C 95 105, 110 120, 110 140 C 110 160, 90 170, 60 170 C 30 170, 10 160, 10 140 C 10 120, 25 105, 45 95 C 30 90, 20 80, 20 65 C 20 45, 30 20, 60 20 Z M 60 48 C 48 48, 40 56, 40 68 C 40 80, 48 88, 60 88 C 72 88, 80 80, 80 68 C 80 56, 72 48, 60 48 Z M 60 112 C 44 112, 32 124, 32 140 C 32 156, 44 168, 60 168 C 76 168, 88 156, 88 140 C 88 124, 76 112, 60 112 Z"
          fill="none"
          stroke="url(#eightGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#eightGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 2.4, ease: "easeInOut", repeat: Infinity, repeatType: "loop" },
            opacity: { duration: 0.4 },
          }}
        />

        <motion.circle
          cx="60"
          cy="32"
          r="4"
          fill="var(--accent)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 blur-2xl">
        <svg viewBox="0 0 120 160" className="h-full w-full">
          <path
            d="M60 20 C 90 20, 100 45, 100 65 C 100 80, 90 90, 75 95 C 95 105, 110 120, 110 140 C 110 160, 90 170, 60 170 C 30 170, 10 160, 10 140 C 10 120, 25 105, 45 95 C 30 90, 20 80, 20 65 C 20 45, 30 20, 60 20 Z"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="12"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  );
}
