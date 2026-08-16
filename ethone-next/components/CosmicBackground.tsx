"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "./SettingsProvider";
import { useCosmicPerformance } from "@/lib/hooks/useCosmicPerformance";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useSettings();
  const { quality, isVisible, pixelRatio } = useCosmicPerformance(settings.backgroundQuality);

  useEffect(() => {
    if (quality === "static" || !settings.ambientEffectsEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false })!;

    let raf = 0;
    let running = true;
    let elapsed = 0;
    let accent = "#8b5cf6";

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

    function readAccent() {
      if (typeof document !== "undefined") {
        accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8b5cf6";
      }
    }

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
      readAccent();
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
          alpha: 0.08 - i * 0.015,
        };
      });

      glows = Array.from({ length: density.glows }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.6,
        r: Math.min(w, h) * (0.2 + Math.random() * 0.3),
        hue: 260 + Math.random() * 40,
        alpha: 0.08 + Math.random() * 0.08,
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

      context.fillStyle = "#000000";
      context.fillRect(0, 0, w, h);

      // Soft nebula glows
      for (const glow of glows) {
        const x = glow.x + Math.sin(elapsed * 0.001 * glow.speed) * 20;
        const y = glow.y + Math.cos(elapsed * 0.001 * glow.speed) * 15;
        const gradient = context.createRadialGradient(x, y, 0, x, y, glow.r);
        gradient.addColorStop(0, `hsla(${glow.hue}, 70%, 55%, ${glow.alpha})`);
        gradient.addColorStop(0.5, `hsla(${glow.hue}, 70%, 35%, ${glow.alpha * 0.3})`);
        gradient.addColorStop(1, "hsla(0, 0%, 0%, 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, w, h);
      }

      // Orbit rings
      context.lineWidth = 1;
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

      // Stars
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
  }, [quality, isVisible, pixelRatio, settings.ambientEffectsEnabled]);

  if (!settings.ambientEffectsEnabled || quality === "static") {
    return (
      <div
        aria-hidden="true"
        className="v8-cosmic-background pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, rgba(88, 28, 135, 0.2) 0%, rgb(9, 9, 11) 50%, rgb(0, 0, 0) 100%)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="v8-cosmic-background pointer-events-none fixed inset-0 -z-10"
      data-quality={quality}
    />
  );
}
