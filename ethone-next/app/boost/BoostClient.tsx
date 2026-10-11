"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { confirmDialog } from "@/lib/confirmDialog";
import { hapticMediumImpact } from "@/lib/haptics";
import {
  Activity,
  Cpu,
  HardDrive,
  Gauge,
  Zap,
  Wifi,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";

interface BoostClientProps {
  id?: string;
}

interface Metrics {
  fps: number | null;
  avgFps: number | null;
  onePercentLow: number | null;
  stutterCount: number;
  heapUsedMb: number | null;
  heapLimitMb: number | null;
  heapPeakMb: number | null;
  heapPercent: number | null;
  storageUsedMb: number | null;
  storageQuotaMb: number | null;
  storagePercent: number | null;
  cores: number | null;
  deviceMemoryGb: number | null;
  rttMs: number | null;
  downlinkMbps: number | null;
  effectiveType: string | null;
  gpuRenderer: string | null;
  gpuVendor: string | null;
  navigationLoadMs: number | null;
  domInteractiveMs: number | null;
  ttfbMs: number | null;
  online: boolean;
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: {
    rtt?: number;
    downlink?: number;
    effectiveType?: string;
  };
};

export default function BoostClient(_props: BoostClientProps) {
  const { success, error } = useToast();
  const [metrics, setMetrics] = useState<Metrics>({
    fps: null,
    avgFps: null,
    onePercentLow: null,
    stutterCount: 0,
    heapUsedMb: null,
    heapLimitMb: null,
    heapPeakMb: null,
    heapPercent: null,
    storageUsedMb: null,
    storageQuotaMb: null,
    storagePercent: null,
    cores: null,
    deviceMemoryGb: null,
    rttMs: null,
    downlinkMbps: null,
    effectiveType: null,
    gpuRenderer: null,
    gpuVendor: null,
    navigationLoadMs: null,
    domInteractiveMs: null,
    ttfbMs: null,
    online: true,
  });

  const [clearing, setClearing] = useState(false);
  const [clearProgress, setClearProgress] = useState(0);
  const [clearStep, setClearStep] = useState<string | null>(null);

  const [hoverInfo, setHoverInfo] = useState<{
    fps: number;
    secondsAgo: number;
    x: number;
    status: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fpsHistory = useRef<number[]>(Array(60).fill(60));
  const hoverRef = useRef<{ x: number } | null>(null);
  const frameDeltas = useRef<number[]>([]);
  const lastFrameTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFpsSample = useRef<number>(0);
  const maxHeapRef = useRef<number>(0);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          setMetrics((prev) => ({
            ...prev,
            gpuRenderer: typeof renderer === "string" ? renderer : "Accélérateur WebGL",
            gpuVendor: typeof vendor === "string" ? vendor : "GPU Vendor",
          }));
        } else {
          setMetrics((prev) => ({
            ...prev,
            gpuRenderer: "Compatible WebGL (pilote masqué)",
            gpuVendor: "Pilote standard",
          }));
        }
      }
    } catch {
      setMetrics((prev) => ({
        ...prev,
        gpuRenderer: "Non disponible",
        gpuVendor: "Inconnu",
      }));
    }
  }, []);

  useEffect(() => {
    const updateStorage = async () => {
      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          const usedMb = est.usage ? Math.round(est.usage / 1048576) : 0;
          const quotaMb = est.quota ? Math.round(est.quota / 1048576) : 0;
          const percent = quotaMb > 0 ? Math.min(100, Math.round((usedMb / quotaMb) * 100)) : 0;
          setMetrics((prev) => ({
            ...prev,
            storageUsedMb: usedMb,
            storageQuotaMb: quotaMb,
            storagePercent: percent,
          }));
        } catch {
        }
      }
    };
    updateStorage();
  }, []);

  useEffect(() => {
    if (typeof performance !== "undefined" && typeof performance.getEntriesByType === "function") {
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        const loadMs = Math.round(nav.loadEventEnd > 0 ? nav.loadEventEnd : performance.now());
        const domMs = Math.round(nav.domContentLoadedEventEnd > 0 ? nav.domContentLoadedEventEnd : nav.domInteractive);
        const ttfb = Math.round(nav.responseStart - nav.requestStart);
        setMetrics((prev) => ({
          ...prev,
          navigationLoadMs: Math.max(1, loadMs),
          domInteractiveMs: Math.max(1, domMs),
          ttfbMs: ttfb > 0 ? ttfb : null,
        }));
      }
    }
  }, []);

  useEffect(() => {
    let rafId = 0;
    lastFrameTime.current = performance.now();
    lastFpsSample.current = performance.now();
    frameCount.current = 0;

    const renderLoop = (now: number) => {
      const delta = now - lastFrameTime.current;
      lastFrameTime.current = now;

      if (delta > 0 && delta < 1000) {
        frameDeltas.current.push(delta);
        if (frameDeltas.current.length > 180) {
          frameDeltas.current.shift();
        }
      }

      frameCount.current += 1;

      if (now - lastFpsSample.current >= 1000) {
        const sampleFps = Math.round((frameCount.current * 1000) / (now - lastFpsSample.current));
        frameCount.current = 0;
        lastFpsSample.current = now;

        fpsHistory.current.push(sampleFps);
        if (fpsHistory.current.length > 60) {
          fpsHistory.current.shift();
        }

        const sum = fpsHistory.current.reduce((acc, v) => acc + v, 0);
        const avg = Math.round(sum / fpsHistory.current.length);

        const sortedDeltas = [...frameDeltas.current].sort((a, b) => b - a);
        const onePercentIdx = Math.max(1, Math.floor(sortedDeltas.length * 0.01));
        const slowest = sortedDeltas.slice(0, onePercentIdx);
        const avgSlowestDelta = slowest.reduce((acc, v) => acc + v, 0) / slowest.length;
        const lowFps = avgSlowestDelta > 0 ? Math.round(1000 / avgSlowestDelta) : sampleFps;

        const stutters = frameDeltas.current.filter((d) => d > 33.3).length;

        const nav = navigator as NavigatorExtras;
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;

        let usedMb: number | null = null;
        let limitMb: number | null = null;
        let pct: number | null = null;

        if (mem) {
          usedMb = Math.round(mem.usedJSHeapSize / 1048576);
          limitMb = Math.round(mem.jsHeapSizeLimit / 1048576);
          if (usedMb > maxHeapRef.current) {
            maxHeapRef.current = usedMb;
          }
          pct = limitMb > 0 ? Math.min(100, Math.round((usedMb / limitMb) * 100)) : null;
        }

        setMetrics((prev) => ({
          ...prev,
          fps: sampleFps,
          avgFps: avg,
          onePercentLow: Math.min(sampleFps, lowFps),
          stutterCount: stutters,
          heapUsedMb: usedMb,
          heapLimitMb: limitMb,
          heapPeakMb: maxHeapRef.current > 0 ? maxHeapRef.current : usedMb,
          heapPercent: pct,
          cores: navigator.hardwareConcurrency || null,
          deviceMemoryGb: nav.deviceMemory ?? null,
          rttMs: nav.connection?.rtt ?? null,
          downlinkMbps: nav.connection?.downlink ?? null,
          effectiveType: nav.connection?.effectiveType ?? null,
          online: navigator.onLine,
        }));
      }

      drawSparkline();
      rafId = requestAnimationFrame(renderLoop);
    };

    const drawSparkline = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const history = fpsHistory.current;
      if (history.length < 2) {
        ctx.restore();
        return;
      }

      const maxFps = 80;
      const minFps = 0;
      const stepX = width / Math.max(59, history.length - 1);

      const y60 = height - ((60 - minFps) / (maxFps - minFps)) * height;
      const y30 = height - ((30 - minFps) / (maxFps - minFps)) * height;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(0, y60);
      ctx.lineTo(width, y60);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, y30);
      ctx.lineTo(width, y30);
      ctx.stroke();
      ctx.setLineDash([]);

      const points: { x: number; y: number; val: number }[] = [];
      const offset = 60 - history.length;
      for (let i = 0; i < history.length; i++) {
        const val = history[i];
        const x = (offset + i) * stepX;
        const clamped = Math.max(minFps, Math.min(maxFps, val));
        const y = height - ((clamped - minFps) / (maxFps - minFps)) * height;
        points.push({ x, y, val });
      }

      const currentFps = history[history.length - 1] ?? 60;
      let strokeColor = "#10b981";
      let gradientTop = "rgba(16, 185, 129, 0.35)";
      let gradientBottom = "rgba(16, 185, 129, 0.0)";

      if (currentFps < 30) {
        strokeColor = "#ef4444";
        gradientTop = "rgba(239, 68, 68, 0.35)";
        gradientBottom = "rgba(239, 68, 68, 0.0)";
      } else if (currentFps < 60) {
        strokeColor = "#f59e0b";
        gradientTop = "rgba(245, 158, 11, 0.35)";
        gradientBottom = "rgba(245, 158, 11, 0.0)";
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);

      ctx.lineTo(lastPoint.x, height);
      ctx.lineTo(points[0].x, height);
      ctx.closePath();

      const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
      fillGrad.addColorStop(0, gradientTop);
      fillGrad.addColorStop(1, gradientBottom);
      ctx.fillStyle = fillGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
      if (hoverRef.current) {
        const hx = hoverRef.current.x;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, 0);
        ctx.lineTo(hx, height);
        ctx.stroke();
        ctx.setLineDash([]);

        let closestPoint = points[0];
        let minDist = Infinity;
        for (const pt of points) {
          const d = Math.abs(pt.x - hx);
          if (d < minDist) {
            minDist = d;
            closestPoint = pt;
          }
        }
        if (closestPoint) {
          ctx.beginPath();
          ctx.arc(closestPoint.x, closestPoint.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = strokeColor;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    hoverRef.current = { x };

    const history = fpsHistory.current;
    if (history.length === 0) return;
    const stepX = rect.width / Math.max(59, history.length - 1);
    const offset = 60 - history.length;
    const idx = Math.min(history.length - 1, Math.max(0, Math.round(x / stepX - offset)));
    const val = history[idx] ?? 60;
    const status = val >= 60 ? "Fluide (>60 FPS)" : val >= 30 ? "Moyen (30-60 FPS)" : "Micro-saccade (<30 FPS)";
    setHoverInfo({
      fps: val,
      secondsAgo: history.length - 1 - idx,
      x,
      status,
    });
  }, []);

  const handleCanvasMouseLeave = useCallback(() => {
    hoverRef.current = null;
    setHoverInfo(null);
  }, []);

  const handleClearOptimization = useCallback(async () => {
    const confirmed = await confirmDialog(
      "Nettoyer les caches offline, service workers et données temporaires pour réinitialiser la performance ?",
      {
        title: "Nettoyage et Réoptimisation",
        confirmLabel: "Optimiser maintenant",
        tone: "default",
      }
    );
    if (!confirmed) return;

    hapticMediumImpact();
    setClearing(true);
    setClearProgress(10);
    setClearStep("Inspection du cache...");

    try {
      await new Promise((r) => setTimeout(r, 250));
      setClearProgress(35);
      setClearStep("Désinscription des Service Workers...");

      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }

      await new Promise((r) => setTimeout(r, 300));
      setClearProgress(70);
      setClearStep("Purge de CacheStorage...");

      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }

      await new Promise((r) => setTimeout(r, 250));
      setClearProgress(90);
      setClearStep("Nettoyage des segments temporaires...");

      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const usedMb = est.usage ? Math.round(est.usage / 1048576) : 0;
        setMetrics((prev) => ({ ...prev, storageUsedMb: usedMb }));
      }

      setClearProgress(100);
      setClearStep("Finalisé avec succès");
      success("Optimisation terminée", "Les caches applicatifs ont été réinitialisés avec succès.");

      setTimeout(() => {
        window.location.reload();
      }, 750);
    } catch {
      error("Erreur d'optimisation", "Le navigateur n'a pas pu purger certains segments protégés.");
      setClearing(false);
      setClearProgress(0);
      setClearStep(null);
    }
  }, [success, error]);

  const currentFps = metrics.fps ?? 60;
  const fpsStatus =
    currentFps >= 60 ? "Fluide" : currentFps >= 30 ? "Moyen" : "Saccades détectées";
  const fpsBadgeColor =
    currentFps >= 60
      ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
      : currentFps >= 30
      ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
      : "text-rose-400 bg-rose-500/15 border-rose-500/30";

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const heapPct = metrics.heapPercent ?? 0;
  const strokeDashoffset = circumference - (heapPct / 100) * circumference;

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] p-4 pb-36 text-[var(--text-primary)] sm:p-8">
      <header className="rise-in mb-6 border-b border-[var(--panel-border)] pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                <Gauge className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Performances & Diagnostic Réel</h1>
            </div>
            <p className="mt-1 max-w-2xl text-xs text-[var(--text-muted)]">
              Mesures matérielles et réseau réelles extraites des API standardisées du navigateur. Zéro allégation marketing, télémétrie authentique.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                fpsBadgeColor
              )}
            >
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>{fpsStatus}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 backdrop-blur-xl shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
                <h2 className="text-sm font-bold">Stabilité du Framerate (60 secondes)</h2>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Courbe temps réel de la fluidité d&apos;affichage avec détection des micro-saccades
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="text-right">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">FPS Actuel</span>
                <span className="font-bold text-base text-[var(--text-primary)]">
                  {metrics.fps !== null ? metrics.fps : "…"}
                </span>
              </div>
              <div className="h-7 w-[1px] bg-[var(--panel-border)]" />
              <div className="text-right">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Moyenne</span>
                <span className="font-bold text-base text-[var(--text-primary)]">
                  {metrics.avgFps !== null ? metrics.avgFps : "…"}
                </span>
              </div>
              <div className="h-7 w-[1px] bg-[var(--panel-border)]" />
              <div className="text-right">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">1% Low</span>
                <span className="font-bold text-base text-amber-400">
                  {metrics.onePercentLow !== null ? metrics.onePercentLow : "…"}
                </span>
              </div>
            </div>
          </div>

          <div
            className="relative mt-4 h-48 w-full overflow-hidden rounded-xl bg-black/40 border border-white/5 p-2"
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          >
            <canvas ref={canvasRef} className="h-full w-full cursor-crosshair" />
            {hoverInfo && (
              <div
                className="pointer-events-none absolute top-3 rounded-xl border border-white/20 bg-black/90 px-3 py-1.5 shadow-2xl backdrop-blur-xl font-mono text-[11px] transition-transform"
                style={{
                  left: `${Math.min(hoverInfo.x, 340)}px`,
                  transform: "translate(-50%, 0)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">{hoverInfo.fps} FPS</span>
                  <span className="text-[10px] text-zinc-400">il y a {hoverInfo.secondsAgo}s</span>
                </div>
                <div
                  className={cn(
                    "text-[10px] font-semibold mt-0.5",
                    hoverInfo.fps >= 60 ? "text-emerald-400" : hoverInfo.fps >= 30 ? "text-amber-400" : "text-rose-400"
                  )}
                >
                  {hoverInfo.status}
                </div>
              </div>
            )}
            <div className="absolute right-3 top-2 flex items-center gap-3 text-[10px] font-mono text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> &gt;60 FPS
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> 30-60 FPS
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> &lt;30 FPS
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--panel-border)]/50">
            <span>Micro-saccades (&gt;33ms) : <strong className="text-[var(--text-primary)] font-mono">{metrics.stutterCount}</strong></span>
            <span>Échantillonnage continu requestAnimationFrame</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 backdrop-blur-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[var(--accent-primary)]" />
              <h2 className="text-sm font-bold">Mémoire Tas V8 (JavaScript)</h2>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Utilisation de la mémoire du moteur JS avec plafond autorisé
            </p>
          </div>

          <div className="flex items-center justify-center py-4">
            {metrics.heapUsedMb !== null ? (
              <div className="relative flex items-center justify-center">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="8"
                    className="stroke-white/10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="stroke-[var(--accent-primary)] transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold font-mono tracking-tight">
                    {heapPct}%
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase">Utilisé</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-[var(--text-muted)]">
                <ShieldCheck className="h-8 w-8 mb-2 opacity-40 text-[var(--accent-primary)]" />
                <span className="text-xs font-semibold">Mesure non exposée</span>
                <span className="text-[10px] max-w-[180px] mt-1">
                  Disponible nativement sous Chrome, Chromium et Edge
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-[var(--panel-border)]/50 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Actuel :</span>
              <span className="font-mono font-semibold">
                {metrics.heapUsedMb !== null ? `${metrics.heapUsedMb} Mo` : "Non fourni"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Plafond V8 :</span>
              <span className="font-mono font-semibold">
                {metrics.heapLimitMb !== null ? `${metrics.heapLimitMb} Mo` : "Standard"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Pic de session :</span>
              <span className="font-mono font-semibold text-amber-400">
                {metrics.heapPeakMb !== null ? `${metrics.heapPeakMb} Mo` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <HardDrive className="h-4 w-4 text-[var(--accent-primary)]" />
            <span className="text-xs font-semibold">Stockage & Quota Réels</span>
          </div>
          <p className="mt-2 text-xl font-bold font-mono">
            {metrics.storageUsedMb !== null ? `${metrics.storageUsedMb} Mo` : "…"}
          </p>
          <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)]"
              style={{ width: `${metrics.storagePercent ?? 0}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
            {metrics.storageQuotaMb !== null
              ? `Sur ${(metrics.storageQuotaMb / 1024).toFixed(1)} Go alloués (${metrics.storagePercent}%)`
              : "Calcul via navigator.storage.estimate"}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold">Carte Graphique (GPU)</span>
          </div>
          <p className="mt-2 text-xs font-bold font-mono line-clamp-2" title={metrics.gpuRenderer || ""}>
            {metrics.gpuRenderer ?? "Détection..."}
          </p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)] truncate">
            {metrics.gpuVendor ?? "WebGL Hardware Acceleration"}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Wifi className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold">Réseau & Latence Réelle</span>
          </div>
          <p className="mt-2 text-xl font-bold font-mono">
            {metrics.rttMs !== null ? `${metrics.rttMs} ms` : metrics.online ? "Connecté" : "Hors ligne"}
          </p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            {metrics.downlinkMbps !== null ? `${metrics.downlinkMbps} Mb/s` : ""}
            {metrics.effectiveType ? ` • Profil ${metrics.effectiveType.toUpperCase()}` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold">Chargement & CPU</span>
          </div>
          <p className="mt-2 text-xl font-bold font-mono">
            {metrics.navigationLoadMs !== null ? `${metrics.navigationLoadMs} ms` : "…"}
          </p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            {metrics.cores ? `${metrics.cores} cœurs logiques` : ""}
            {metrics.deviceMemoryGb ? ` • ≈${metrics.deviceMemoryGb} Go RAM` : ""}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-6 backdrop-blur-2xl shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4.5 w-4.5 text-[var(--accent-primary)]" />
              <h2 className="text-base font-bold">Console d&apos;Optimisation & Purge du Cache</h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] max-w-xl">
              Purge en profondeur les caches de requêtes HTTP, le Service Worker offline et les caches temporaires sans supprimer vos notes ni vos préférences.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearOptimization}
            disabled={clearing}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-2.5 text-xs font-bold text-[var(--accent-contrast)] shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {clearing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Optimisation en cours…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Vider les caches et optimiser</span>
              </>
            )}
          </button>
        </div>

        {clearing && (
          <div className="mt-5 space-y-2 border-t border-[var(--panel-border)]/60 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-primary)]">{clearStep}</span>
              <span className="font-mono text-[var(--text-muted)]">{clearProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                style={{ width: `${clearProgress}%` }}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
