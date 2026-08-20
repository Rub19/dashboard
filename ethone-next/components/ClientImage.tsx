"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

type ImageStatus = "idle" | "loading" | "ok" | "error";

function isValidImageUrl(src?: string): src is string {
  return typeof src === "string" && src.length > 0 && /^https?:\/\/\S+/.test(src);
}

export function useClientImage(candidates: (string | undefined)[], timeoutMs = 4000) {
  const sources = useMemo(() => candidates.filter(isValidImageUrl), [candidates]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<ImageStatus>(sources.length > 0 ? "loading" : "error");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<ImageStatus>(status);
  const indexRef = useRef(index);
  const sourcesRef = useRef(sources);

  useLayoutEffect(() => {
    statusRef.current = status;
    indexRef.current = index;
    sourcesRef.current = sources;
  }, [status, index, sources]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setIndex(0);
    setStatus(sources.length > 0 ? "loading" : "error");
  }, [sources]);

  useEffect(() => {
    clearTimer();
    if (statusRef.current !== "loading") return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (statusRef.current !== "loading") return;
      if (indexRef.current < sourcesRef.current.length - 1) {
        setIndex((i) => i + 1);
      } else {
        setStatus("error");
      }
    }, timeoutMs);

    return () => clearTimer();
  }, [index, sources.length, timeoutMs, clearTimer]);

  const ok = useCallback(() => {
    if (statusRef.current === "ok") return;
    clearTimer();
    setStatus("ok");
  }, [clearTimer]);

  const next = useCallback(() => {
    if (statusRef.current !== "loading") return;
    clearTimer();
    if (indexRef.current < sourcesRef.current.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setStatus("error");
    }
  }, [clearTimer]);

  return {
    src: sources[index],
    status,
    ok,
    next,
    loading: status === "loading" || status === "idle",
    error: status === "error",
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
  timeoutMs = 4000,
  priority,
  loading,
  onResolve,
}: ClientImageProps) {
  const sources = useMemo(
    () => (candidates ? candidates : src ? [src] : []).filter(isValidImageUrl),
    [candidates, src]
  );
  const { src: resolved, status, ok, next } = useClientImage(sources, timeoutMs);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const onResolveRef = useRef(onResolve);

  useLayoutEffect(() => {
    onResolveRef.current = onResolve;
  }, [onResolve]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || status !== "loading") return;
    let cancelled = false;

    // The browser may have the image cached and complete already.
    if (img.complete) {
      if (img.naturalWidth > 0) {
        ok();
        onResolveRef.current?.(resolved);
      } else {
        next();
      }
      return;
    }

    if (typeof img.decode === "function") {
      img
        .decode()
        .then(() => {
          if (!cancelled) ok();
        })
        .catch(() => {
          // img.decode() can fail on cross-origin / tainted images.
          // We ignore it and rely on the standard onLoad/onError events,
          // which are authoritative for display.
        });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, status]);

  if (!resolved || status === "error") {
    return fallback ?? null;
  }

  function handleLoad() {
    ok();
    onResolveRef.current?.(resolved);
  }

  function handleError() {
    next();
  }

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
