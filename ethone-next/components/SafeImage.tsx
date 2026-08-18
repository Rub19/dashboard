"use client";

import { useEffect, useState } from "react";
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
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const validSrc = isValidImageUrl(src) ? src : "";

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [validSrc]);

  const showSkeleton = !!validSrc && !loaded && !error;

  const content = (() => {
    if (!validSrc || error) {
      if (fallback === "initials" && initial) {
        return (
          <span
            className={cn(
              "inline-flex h-full w-full items-center justify-center overflow-hidden bg-[var(--panel-bg)] text-[10px] font-medium text-[var(--foreground)]",
              fill && "absolute inset-0",
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
            "inline-flex h-full w-full items-center justify-center overflow-hidden bg-white/[0.05]",
            fill && "absolute inset-0",
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
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoadingComplete={() => setLoaded(true)}
        onError={() => setError(true)}
        priority={priority}
        loading={loading}
      />
    );
  })();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        fill && "absolute inset-0",
        className,
      )}
      aria-label={alt || undefined}
    >
      {showSkeleton && (
        <span
          className={cn(
            "absolute inset-0 z-10 animate-pulse bg-white/[0.06]",
            fill ? "h-full w-full" : "",
          )}
          aria-hidden="true"
        />
      )}
      {content}
    </span>
  );
}
