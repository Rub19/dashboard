"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export default function GameFrame({ src, title }: { src: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === iframeRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (!iframeRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (typeof iframeRef.current.requestFullscreen === "function") {
      iframeRef.current.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="relative h-full w-full flex-1">
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="h-full w-full flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-black"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
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
