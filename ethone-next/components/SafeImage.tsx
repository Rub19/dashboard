"use client";

import { useMemo } from "react";
import ClientImage from "@/components/ClientImage";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";

export type SafeImageProps = {
  src?: string | null;
  candidates?: (string | null | undefined)[];
  alt?: string;
  size?: number;
  fill?: boolean;
  className?: string;
  iconClassName?: string;
  fallback?: "music" | "initials" | "none";
  initial?: string;
  priority?: boolean;
  sizes?: string;
  loading?: "eager" | "lazy";
  timeoutMs?: number;
  crossOrigin?: "anonymous" | "use-credentials";
};

export default function SafeImage({
  src,
  candidates,
  alt = "",
  size = 48,
  fill = false,
  className = "",
  iconClassName = "",
  fallback = "music",
  initial = "",
  priority = false,
  sizes,
  loading,
  timeoutMs,
  crossOrigin,
}: SafeImageProps) {
  let fallbackNode: React.ReactNode = null;

  if (fallback === "initials" && initial) {
    fallbackNode = (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden bg-[var(--panel-bg)] text-[10px] font-medium text-[var(--text-primary)]",
          fill && "absolute inset-0",
          className
        )}
        aria-hidden="true"
      >
        {initial.slice(0, 2).toUpperCase()}
      </span>
    );
  } else if (fallback === "none") {
    fallbackNode = null;
  } else {
    fallbackNode = (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden bg-[var(--text-primary)]/[0.05]",
          fill && "absolute inset-0",
          className
        )}
        aria-hidden="true"
      >
        <Music className={cn("text-[var(--text-muted)]", iconClassName)} />
      </span>
    );
  }

  const imageCandidates = useMemo(
    () =>
      candidates
        ? (candidates.filter((c) => typeof c === "string" && c.length > 0) as string[])
        : src
          ? [src]
          : undefined,
    [candidates, src]
  );

  return (
    <ClientImage
      candidates={imageCandidates}
      alt={alt}
      fill={fill}
      width={fill ? undefined : size}
      height={fill ? undefined : size}
      sizes={sizes}
      className={cn("object-cover", className)}
      fallback={fallbackNode}
      priority={priority}
      loading={loading}
      timeoutMs={timeoutMs}
      crossOrigin={crossOrigin}
    />
  );
}
