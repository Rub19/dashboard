"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";

export type AvatarSize = "sm" | "md" | "lg";

export type AvatarProps = {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  className?: string;
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

const FALLBACK_SIZES: Record<AvatarSize, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({ src, alt, fallback, size = "md", className }: AvatarProps) {
  const [error, setError] = useState(false);
  const label = initials(alt || fallback);
  const showImage = src && !error;

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)]",
        SIZE_CLASSES[size],
        className
      )}
      aria-label={alt || fallback}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt || ""}
          fill
          sizes="64px"
          className="object-cover"
          onError={() => setError(true)}
        />
      ) : label ? (
        <span className={cn("font-medium", FALLBACK_SIZES[size])}>{label}</span>
      ) : (
        <Icon name="user" className="h-4 w-4 text-[var(--text-muted)]" />
      )}
    </div>
  );
}
