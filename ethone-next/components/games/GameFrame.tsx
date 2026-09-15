"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useZenMode } from "@/lib/hooks/useZenMode";

export default function GameFrame({ src, title }: { src: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { zenMode, enable: enableZen, disable: disableZen } = useZenMode();

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === iframeRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // On mobile, auto-enter zen mode (hides the floating dock/topbar/rail via
  // globals.css's [data-zen-mode="true"] rules) so the game gets the whole
  // screen the moment the page opens, without needing a tap — the native
  // Fullscreen API can't be invoked without a user gesture, so it can't do
  // this part on its own. Restores whatever zen mode was set to before.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches) return;
    const wasZen = zenMode;
    enableZen();
    return () => {
      if (!wasZen) disableZen();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleFullscreen() {
    if (!iframeRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      iframeRef.current.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="relative h-full w-full flex-1">
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
}
