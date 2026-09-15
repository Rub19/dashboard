"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GameFrame({ src, title }: { src: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === iframeRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Decided with useLayoutEffect (before the browser paints) rather than
  // useEffect, so the very first thing painted is already the right mode —
  // switching a beat later would otherwise cause a visible flash and a
  // second iframe load.
  //
  // On mobile the game is portaled straight to document.body and given
  // position:fixed covering the full viewport, instead of trying to make
  // it fill whatever space the app shell leaves around it: the shell's
  // page-transition wrapper (PageTransition.tsx) keeps a Framer Motion
  // `transform` on an ancestor of every page at all times, which turns any
  // position:fixed element still inside that subtree into something
  // scoped to that ancestor's box instead of the real viewport — portaling
  // out to document.body sidesteps that entirely, and also means the game
  // no longer depends on the shell's flex layout correctly reclaiming the
  // space left by the hidden dock/topbar.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggleFullscreen() {
    if (!iframeRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      iframeRef.current.requestFullscreen().catch(() => {});
    }
  }

  const content = (
    <div
      className={cn(
        "relative h-full w-full flex-1",
        isMobile && "fixed inset-0 z-[9999] h-[100dvh] w-screen"
      )}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="h-full w-full flex-1 rounded-none border-0 bg-black md:rounded-[var(--panel-radius)] md:border md:border-[var(--panel-border)]"
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
      />
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-black/60 text-zinc-200 backdrop-blur-sm transition-all hover:bg-black/80 hover:text-white active:scale-95"
        title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );

  if (isMobile && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
