"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "./SettingsProvider";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  pulse: number;
};

export default function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings.ambientEffectsEnabled || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles: Particle[] = [];
    const context = ctx;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticles() {
      const count = settings.performanceMode === "low" ? 18 : 35;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      }));
    }

    resize();
    createParticles();
    window.addEventListener("resize", resize);

    function draw() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8b5cf6";
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const alpha = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
        context.beginPath();
        context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        context.fillStyle = `color-mix(in srgb, ${accent} ${Math.round(alpha * 100)}%, transparent)`;
        context.fill();

        particles.forEach((other) => {
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            context.beginPath();
            context.moveTo(p.x, p.y);
            context.lineTo(other.x, other.y);
            context.strokeStyle = `color-mix(in srgb, ${accent} ${Math.round((1 - dist / 120) * 0.12 * 100)}%, transparent)`;
            context.lineWidth = 0.5;
            context.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [settings.ambientEffectsEnabled, settings.performanceMode, settings.aura]);

  if (!settings.ambientEffectsEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="v8-ambient-particles pointer-events-none fixed inset-0 -z-10"
      data-aura={settings.aura}
      style={{ opacity: 0.6, mixBlendMode: "screen" }}
    />
  );
}
