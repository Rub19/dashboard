"use client";

import { useEffect, useRef, useState } from "react";

export type BackgroundQuality = "high" | "balanced" | "low" | "static";

export type CosmicPerformance = {
  quality: BackgroundQuality;
  isVisible: boolean;
  fps: number;
  isMobile: boolean;
  pixelRatio: number;
};

function isMobileOrTablet() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
  return (
    isTouch ||
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|tablet/.test(ua)
  );
}

function clampPixelRatio(ratio: number) {
  return isMobileOrTablet() ? Math.min(ratio, 1.5) : Math.min(ratio, 2);
}

export function useCosmicPerformance(preferred: BackgroundQuality): CosmicPerformance {
  const [isVisible, setIsVisible] = useState(
    typeof document !== "undefined" ? !document.hidden : true
  );
  const [fps, setFps] = useState(60);
  const [isMobile] = useState(() => isMobileOrTablet());
  const [pixelRatio] = useState(() =>
    typeof window !== "undefined" ? clampPixelRatio(window.devicePixelRatio || 1) : 1
  );
  const [quality, setQuality] = useState<BackgroundQuality>(preferred);

  const fpsRef = useRef({ frames: 0, lastTime: 0 });
  const lowStartRef = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;

    function onVisibility() {
      setIsVisible(!document.hidden);
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (typeof performance === "undefined") return;

    let raf = 0;
    const tracker = fpsRef.current;
    tracker.lastTime = performance.now();
    tracker.frames = 0;

    function tick() {
      const now = performance.now();
      tracker.frames++;

      if (now - tracker.lastTime >= 1000) {
        const current = Math.round((tracker.frames * 1000) / (now - tracker.lastTime));
        tracker.frames = 0;
        tracker.lastTime = now;
        setFps(current);
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (preferred === "static") {
      setQuality("static");
      return;
    }

    if (isMobile && preferred === "high") {
      setQuality("balanced");
      return;
    }

    if (fps < 40) {
      if (lowStartRef.current === 0) {
        lowStartRef.current = performance.now();
      } else if (performance.now() - lowStartRef.current > 3000) {
        setQuality(preferred === "high" ? "balanced" : "low");
      }
    } else {
      lowStartRef.current = 0;
      setQuality(preferred);
    }
  }, [fps, preferred, isMobile]);

  return { quality, isVisible, fps, isMobile, pixelRatio };
}
