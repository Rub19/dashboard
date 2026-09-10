"use client";

import { cn } from "@/lib/utils";

/**
 * Flat, single-tone monogram avatar shared across the mail views.
 * Deterministic tone per sender — no gradients, no glow, theme-neutral.
 */

const TONES = [
  "bg-[#6366f1]/14 text-[#a5b4fc]",
  "bg-[#0ea5e9]/14 text-[#7dd3fc]",
  "bg-[#10b981]/14 text-[#6ee7b7]",
  "bg-[#f59e0b]/16 text-[#fcd34d]",
  "bg-[#f43f5e]/14 text-[#fda4af]",
  "bg-[#a855f7]/14 text-[#d8b4fe]",
  "bg-[#14b8a6]/14 text-[#5eead4]",
] as const;

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function initialsFrom(name: string, email: string) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] || "?";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

const SIZES = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-[11px]",
  lg: "h-11 w-11 text-xs",
} as const;

type MailAvatarProps = {
  name?: string | null;
  email?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
};

export default function MailAvatar({ name, email, size = "md", className }: MailAvatarProps) {
  const key = (name || email || "?").trim().toLowerCase();
  const tone = TONES[hashString(key) % TONES.length];

  return (
    <span
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-wide",
        SIZES[size],
        tone,
        className
      )}
      aria-hidden="true"
    >
      {initialsFrom(name || "", email || "")}
    </span>
  );
}
