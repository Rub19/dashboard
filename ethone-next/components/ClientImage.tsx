"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ClientImageStatus = "idle" | "loading" | "ok" | "error";

function isValidImageUrl(src?: string): src is string {
  return (
    typeof src === "string" &&
    src.length > 0 &&
    (src.startsWith("https://") || src.startsWith("http://"))
  );
}

function testImage(src: string, timeoutMs = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    const img = document.createElement("img");
    let done = false;

    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      img.onload = null;
      img.onerror = null;
      img.src = "";
      resolve(false);
    }, timeoutMs);

    img.onload = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve(true);
    };

    img.onerror = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve(false);
    };

    img.src = src;
  });
}

export function useClientImage(candidates: (string | undefined)[], timeoutMs = 10000) {
  const [status, setStatus] = useState<ClientImageStatus>("idle");
  const [activeSrc, setActiveSrc] = useState<string | undefined>(undefined);

  const validCandidates = useMemo(
    () => candidates.filter(isValidImageUrl),
    [candidates]
  );

  useEffect(() => {
    let cancelled = false;

    if (validCandidates.length === 0) {
      setStatus("error");
      setActiveSrc(undefined);
      return;
    }

    setStatus("loading");
    setActiveSrc(undefined);

    async function find() {
      const results = await Promise.all(
        validCandidates.map((src) => testImage(src, timeoutMs))
      );

      if (cancelled) return;

      const firstOkIndex = results.findIndex((ok) => ok);
      if (firstOkIndex !== -1) {
        setActiveSrc(validCandidates[firstOkIndex]);
        setStatus("ok");
      } else {
        setActiveSrc(undefined);
        setStatus("error");
      }
    }

    find();

    return () => {
      cancelled = true;
    };
  }, [validCandidates, timeoutMs]);

  return {
    src: activeSrc,
    loading: status === "loading" || status === "idle",
    error: status === "error",
  };
}

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
};

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
}: ClientImageProps) {
  const resolvedCandidates = useMemo(
    () => (candidates ? candidates : src ? [src] : []),
    [candidates, src]
  );

  const { src: resolved } = useClientImage(resolvedCandidates, timeoutMs);
  const [domError, setDomError] = useState(false);

  if (!resolved || domError) {
    return fallback ?? null;
  }

  if (fill) {
    return (
      <Image
        key={resolved}
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        className={cn("object-cover", className)}
        style={style}
        onError={() => setDomError(true)}
        priority={priority}
        loading={loading}
      />
    );
  }

  return (
    <Image
      key={resolved}
      src={resolved}
      alt={alt}
      width={width || 64}
      height={height || 64}
      unoptimized
      className={cn("object-cover", className)}
      style={style}
      onError={() => setDomError(true)}
      priority={priority}
      loading={loading}
    />
  );
}
