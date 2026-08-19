"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ClientImageProps = {
  candidates?: (string | undefined)[];
  src?: string;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
  timeoutMs?: number;
  priority?: boolean;
  loading?: "eager" | "lazy";
  onResolve?: (src: string) => void;
};

function isValidImageUrl(src?: string): src is string {
  return typeof src === "string" && src.length > 0 && /^https?:\/\//.test(src);
}

export function useClientImage(candidates: (string | undefined)[], timeoutMs = 10000) {
  const sources = useMemo(() => candidates.filter(isValidImageUrl), [candidates]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    setIndex(0);
    setStatus(sources.length > 0 ? "loading" : "error");
  }, [sources]);

  useEffect(() => {
    if (sources.length === 0) return;
    const currentSrc = sources[index];
    if (!currentSrc) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (index < sources.length - 1) {
        setIndex((i) => i + 1);
      } else {
        setStatus("error");
      }
    }, timeoutMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sources, index, timeoutMs]);

  return {
    src: sources[index],
    loading: status === "loading" || status === "idle",
    error: status === "error",
    next: () => {
      if (index < sources.length - 1) {
        setIndex((i) => i + 1);
      } else {
        setStatus("error");
      }
    },
    ok: () => setStatus("ok"),
  };
}

export default function ClientImage({
  candidates,
  src,
  alt = "",
  fill,
  width,
  height,
  sizes,
  className,
  style,
  fallback,
  timeoutMs = 10000,
  priority,
  loading,
  onResolve,
}: ClientImageProps) {
  const sources = useMemo(
    () => (candidates ? candidates : src ? [src] : []).filter(isValidImageUrl),
    [candidates, src]
  );

  const { src: resolved, next, ok } = useClientImage(sources, timeoutMs);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("loading");
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setStatus(resolved ? "loading" : "error");
  }, [resolved]);

  useEffect(() => {
    if (status !== "loading") return;
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      if (img.naturalWidth === 0) {
        handleError();
      } else {
        markOk();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, status]);

  if (!resolved || status === "error") {
    return fallback ?? null;
  }

  function markOk() {
    setStatus("ok");
    ok();
    if (resolved) onResolve?.(resolved);
  }

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.naturalWidth === 0) {
      handleError();
      return;
    }
    markOk();
  };

  const handleError = () => {
    setStatus("loading");
    next();
  };

  const imgClass = cn(
    "z-10 object-cover transition-opacity duration-300",
    status === "ok" ? "opacity-100" : "opacity-0",
    fill ? "absolute inset-0 h-full w-full" : "",
    className
  );

  return (
    <span
      className={cn("relative inline-flex", fill && "h-full w-full")}
      style={style}
      aria-label={alt || undefined}
    >
      {status !== "ok" && fallback && (
        <span className={cn("absolute inset-0 z-0", fill && "h-full w-full")}>{fallback}</span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        key={resolved}
        src={resolved}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes}
        className={imgClass}
        style={style}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? "eager" : loading}
        decoding={priority ? "sync" : "async"}
        referrerPolicy="no-referrer"
      />
    </span>
  );
}
