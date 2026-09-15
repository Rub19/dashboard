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

  // On mobile, hide the floating dock/topbar/rail (via globals.css's
  // [data-game-immersive="true"] rules) so the game gets the whole screen
  // the moment the page opens, without needing a tap — the native
  // Fullscreen API can't be invoked without a user gesture, so it can't do
  // this part on its own.
  //
  // This sets a DOM attribute directly instead of going through the
  // persisted `zenMode` setting: SettingsProvider reloads settings from
  // local storage and then from the server asynchronously right after
  // mount, and that reload was clobbering an `update({ zenMode: true })`
  // call made here milliseconds earlier, so the dock never actually
  // stayed hidden. A dedicated attribute nothing else writes to has no
  // such race.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches) return;
    document.documentElement.setAttribute("data-game-immersive", "true");
    return () => {
      document.documentElement.removeAttribute("data-game-immersive");
    };
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
