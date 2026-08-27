"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "./SettingsProvider";
import { useCosmicPerformance } from "@/lib/hooks/useCosmicPerformance";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const AURA_CONFIGS: Record<string, { hues: number[]; accent: string; bgGlow: string }> = {
  classic: {
    hues: [265, 280, 250],
    accent: "#8b5cf6",
    bgGlow:
      "radial-gradient(ellipse at 50% 10%, rgba(139, 92, 246, 0.18) 0%, rgba(9, 9, 11, 0.8) 50%, rgb(6, 7, 10) 100%)",
  },
  boreal: {
    hues: [160, 185, 200],
    accent: "#06b6d4",
    bgGlow:
      "radial-gradient(ellipse at 25% 15%, rgba(6, 182, 212, 0.2) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(16, 185, 129, 0.18) 0%, transparent 55%), rgb(5, 8, 12)",
  },
  cyberpunk: {
    hues: [330, 345, 290],
    accent: "#f43f5e",
    bgGlow:
      "radial-gradient(ellipse at 75% 15%, rgba(244, 63, 94, 0.2) 0%, transparent 60%), radial-gradient(ellipse at 20% 30%, rgba(168, 85, 247, 0.16) 0%, transparent 55%), rgb(8, 5, 10)",
  },
  eclipse: {
    hues: [38, 48, 260],
    accent: "#f59e0b",
    bgGlow:
      "radial-gradient(ellipse at 50% 85%, rgba(245, 158, 11, 0.18) 0%, transparent 60%), radial-gradient(ellipse at 50% 10%, rgba(99, 102, 241, 0.15) 0%, transparent 55%), rgb(7, 6, 10)",
  },
  emerald: {
    hues: [150, 165, 140],
    accent: "#10b981",
    bgGlow:
      "radial-gradient(ellipse at 50% 15%, rgba(16, 185, 129, 0.2) 0%, rgba(9, 9, 11, 0.8) 55%, rgb(4, 8, 7) 100%)",
  },
  mineral: {
    hues: [200, 215, 230],
    accent: "#38bdf8",
    bgGlow:
      "radial-gradient(circle at 50% 15%, rgba(56, 189, 248, 0.2) 0%, rgba(9, 9, 11, 0.8) 55%, rgb(5, 7, 12) 100%)",
  },
};

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useSettings();
  const { quality, isVisible, pixelRatio } = useCosmicPerformance(settings.backgroundQuality);

  const currentAura = settings.aura || "classic";
  const auraConfig = AURA_CONFIGS[currentAura] || AURA_CONFIGS.classic;

  useEffect(() => {
    if (quality === "static" || !settings.ambientEffectsEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false })!;

    let raf = 0;
    let running = true;
    let elapsed = 0;
    let accent = auraConfig.accent;

    const densityByQuality = {
      high: { stars: 220, rings: 4, glows: 3, speed: 1 },
      balanced: { stars: 140, rings: 3, glows: 2, speed: 0.7 },
      low: { stars: 70, rings: 2, glows: 1, speed: 0.4 },
      static: { stars: 0, rings: 0, glows: 0, speed: 0 },
    };

    const density = densityByQuality[quality];

    type Star = { x: number; y: number; z: number; base: number; pulse: number; speed: number };
    type Ring = { cx: number; cy: number; rx: number; ry: number; angle: number; speed: number; alpha: number };
    type Glow = { x: number; y: number; r: number; hue: number; alpha: number; speed: number };

    let stars: Star[] = [];
    let rings: Ring[] = [];
    let glows: Glow[] = [];

    function resize() {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * pixelRatio);
      canvas.height = Math.floor(h * pixelRatio);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(pixelRatio, pixelRatio);
      accent = auraConfig.accent;
      initScene(w, h);
    }

    function initScene(w: number, h: number) {
      stars = Array.from({ length: density.stars }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 0.5 + 0.1,
        base: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.5 + 0.5,
      }));

      rings = Array.from({ length: density.rings }, (_, i) => {
        const scale = 0.25 + i * 0.2;
        return {
          cx: w * 0.5,
          cy: h * 0.55,
          rx: Math.min(w, h) * scale,
          ry: Math.min(w, h) * scale * 0.35,
          angle: (Math.PI / 4) * i,
          speed: (Math.random() * 0.1 + 0.05) * (i % 2 === 0 ? 1 : -1) * density.speed,
          alpha: 0.1 - i * 0.018,
        };
      });

      const possibleHues = auraConfig.hues;
      glows = Array.from({ length: density.glows }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.6,
        r: Math.min(w, h) * (0.28 + Math.random() * 0.35),
        hue: possibleHues[i % possibleHues.length],
        alpha: 0.12 + Math.random() * 0.08,
        speed: Math.random() * 0.2 + 0.1,
      }));
    }

    function draw() {
      if (!canvas) return;

      if (!running || !isVisible) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const w = canvas.width / pixelRatio;
      const h = canvas.height / pixelRatio;
      elapsed += 1;

      context.fillStyle = "#08090d";
      context.fillRect(0, 0, w, h);

      // Soft nebula glows matched to selected Aura
      for (const glow of glows) {
        const x = glow.x + Math.sin(elapsed * 0.001 * glow.speed) * 25;
        const y = glow.y + Math.cos(elapsed * 0.001 * glow.speed) * 20;
        const gradient = context.createRadialGradient(x, y, 0, x, y, glow.r);
        gradient.addColorStop(0, `hsla(${glow.hue}, 75%, 55%, ${glow.alpha})`);
        gradient.addColorStop(0.5, `hsla(${glow.hue}, 70%, 35%, ${glow.alpha * 0.35})`);
        gradient.addColorStop(1, "hsla(0, 0%, 0%, 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, w, h);
      }

      // Orbit rings
      context.lineWidth = 1.2;
      for (const ring of rings) {
        ring.angle += ring.speed * 0.005;
        context.save();
        context.translate(ring.cx, ring.cy);
        context.rotate(ring.angle);
        context.scale(1, ring.ry / ring.rx);
        context.beginPath();
        context.arc(0, 0, ring.rx, 0, Math.PI * 2);
        context.strokeStyle = `color-mix(in srgb, ${accent} ${Math.round(ring.alpha * 100)}%, transparent)`;
        context.stroke();
        context.restore();
      }

      // Twinkling Stars
      for (const star of stars) {
        star.pulse += 0.02 * star.speed;
        const twinkle = 0.6 + 0.4 * Math.sin(star.pulse);
        const alpha = star.base * twinkle * star.z * 2;
        const size = lerp(0.5, 2.5, star.z);
        context.beginPath();
        context.arc(star.x, star.y, size, 0, Math.PI * 2);
        context.fillStyle = `color-mix(in srgb, ${accent} ${Math.round(alpha * 100)}%, white ${Math.round((1 - alpha) * 20)}%)`;
        context.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    function onVisibility() {
      running = !document.hidden;
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
    };
  }, [quality, isVisible, pixelRatio, settings.ambientEffectsEnabled, currentAura, auraConfig]);

  if (!settings.ambientEffectsEnabled || quality === "static") {
    return (
      <div
        aria-hidden="true"
        className="v8-cosmic-background pointer-events-none fixed inset-0 -z-10 transition-all duration-700"
        style={{
          backgroundImage: auraConfig.bgGlow,
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="v8-cosmic-background pointer-events-none fixed inset-0 -z-10 transition-all duration-700"
      data-quality={quality}
    />
  );
}
