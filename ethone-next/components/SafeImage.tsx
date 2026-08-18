"use client";

import { useState } from "react";
import Image from "next/image";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";

export type SafeImageProps = {
  src?: string | null;
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
};

function isValidImageUrl(src?: string | null): src is string {
  return (
    typeof src === "string" &&
    src.length > 0 &&
    (src.startsWith("https://") ||
      src.startsWith("http://") ||
      src.startsWith("data:") ||
      src.startsWith("/"))
  );
}

export default function SafeImage({
  src,
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
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const validSrc = isValidImageUrl(src) ? src : "";

  if (!validSrc || error) {
    if (fallback === "initials" && initial) {
      return (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center overflow-hidden bg-[var(--panel-bg)] text-[10px] font-medium text-[var(--foreground)]",
            fill && "absolute inset-0",
            className
          )}
          aria-hidden="true"
        >
          {initial.slice(0, 2).toUpperCase()}
        </span>
      );
    }

    if (fallback === "none") {
      return null;
    }

    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden bg-white/[0.05]",
          fill && "absolute inset-0",
          className
        )}
        aria-hidden="true"
      >
        <Music className={cn("text-zinc-400", iconClassName)} />
      </span>
    );
  }

  return (
    <Image
      src={validSrc}
      alt={alt}
      width={fill ? undefined : size}
      height={fill ? undefined : size}
      fill={fill}
      sizes={sizes}
      unoptimized
      className={cn("object-cover", className)}
      onError={() => setError(true)}
      priority={priority}
      loading={loading}
    />
  );
}
