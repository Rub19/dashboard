"use client";

import React, { useEffect, useRef, useCallback, memo } from "react";
import { useSound } from "@/lib/sound";
import { useSettings } from "@/components/SettingsProvider";
import { cn } from "@/lib/utils";

export type VisualizerMode = "nebula" | "spectrum" | "horizon" | "ripples";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  hue: number;
  alpha: number;
  bandIndex: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface VisualizerCanvasProps {
  mode: VisualizerMode;
  accentColor?: string;
  isAudioActive?: boolean;
  className?: string;
}

export const VisualizerCanvas = memo(function VisualizerCanvas({
  mode,
  accentColor = "#10b981",
  isAudioActive = false,
  className,
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { getAnalyser } = useSound();
  const { settings } = useSettings();
  const prefersReduced = settings.reducedMotion;

  const mouseRef = useRef({ x: -1000, y: -1000, vx: 0, vy: 0, lastX: 0, lastY: 0, isHovering: false });
  const ripplesRef = useRef<Ripple[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialisation des particules
  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.min(140, Math.floor((width * height) / 10000) + 40);
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const baseRadius = 1.2 + Math.random() * 2.8;
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        baseRadius,
        radius: baseRadius,
        hue: 160 + Math.random() * 120, // Teintes turquoise à violettes
        alpha: 0.2 + Math.random() * 0.65,
        bandIndex: Math.floor(Math.random() * 32),
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
      if (particlesRef.current.length === 0 || particlesRef.current.length < 30) {
        initParticles(width, height);
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Buffers d'analyse audio
    const analyser = getAnalyser();
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    let phase = 0;
    let lastBeatTime = 0;

    const render = (time: number) => {
      if (width === 0 || height === 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      phase += prefersReduced ? 0.003 : 0.015;

      // Lecture des données audio
      const currentAnalyser = getAnalyser();
      let avgEnergy = 0;
      let bassEnergy = 0;

      if (currentAnalyser) {
        currentAnalyser.getByteFrequencyData(freqData);
        currentAnalyser.getByteTimeDomainData(timeData);

        let sum = 0;
        let bassSum = 0;
        const bassCount = Math.min(16, bufferLength);
        for (let i = 0; i < bufferLength; i++) {
          sum += freqData[i];
          if (i < bassCount) bassSum += freqData[i];
        }
        avgEnergy = sum / bufferLength / 255;
        bassEnergy = bassSum / bassCount / 255;
      } else {
        // Mode veille organique calme
        avgEnergy = isAudioActive ? 0.28 : 0.08;
        bassEnergy = isAudioActive ? 0.35 : 0.1;
      }

      // Nettoyage fluide avec persistance de trace néon
      ctx.clearRect(0, 0, width, height);

      // Traitement des modes de visualisation
      if (mode === "nebula") {
        // --- 1. NÉBULEUSE COSMIQUE DE PARTICULES RÉACTIVES ---
        const particles = particlesRef.current;
        const mouse = mouseRef.current;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const freqFactor = freqData[p.bandIndex] ? freqData[p.bandIndex] / 255 : avgEnergy;
          const energyPulse = 1 + freqFactor * 2.2 + bassEnergy * 1.5;

          // Déplacement
          p.x += p.vx * energyPulse;
          p.y += p.vy * energyPulse;

          // Répulsion souris
          if (mouse.isHovering) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 140 && dist > 1) {
              const force = (1 - dist / 140) * 1.6;
              p.x += (dx / dist) * force * 3;
              p.y += (dy / dist) * force * 3;
            }
          }

          // Rebonds aux bords
          if (p.x < 0) { p.x = 0; p.vx *= -1; }
          else if (p.x > width) { p.x = width; p.vx *= -1; }
          if (p.y < 0) { p.y = 0; p.vy *= -1; }
          else if (p.y > height) { p.y = height; p.vy *= -1; }

          // Rayon modulé par l'amplitude
          const currentRadius = p.baseRadius * (1 + freqFactor * 1.8);

          // Rendu du halo lumineux
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius * 3.5);
          gradient.addColorStop(0, `hsla(${p.hue}, 90%, 65%, ${p.alpha * (0.6 + avgEnergy * 0.4)})`);
          gradient.addColorStop(0.5, `hsla(${p.hue}, 85%, 55%, ${p.alpha * 0.25})`);
          gradient.addColorStop(1, "transparent");

          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Cœur de la particule
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 95%, 85%, ${Math.min(1, p.alpha + 0.3)})`;
          ctx.fill();

          // Liens neuronaux / toiles de constellation entre particules proches
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            const maxDist = 95 + avgEnergy * 45;
            if (dist < maxDist) {
              const lineAlpha = (1 - dist / maxDist) * 0.16 * (0.5 + avgEnergy * 0.8);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 80%, 60%, ${lineAlpha})`;
              ctx.lineWidth = 0.85;
              ctx.stroke();
            }
          }
        }
      } else if (mode === "spectrum") {
        // --- 2. ANNEAU RADIAL ÉNERGÉTIQUE (BLOOM SPECTRUM) ---
        const cx = width / 2;
        const cy = height / 2;
        const baseRadius = Math.min(width, height) * 0.24 + bassEnergy * 18;
        const bars = 64;
        const step = (Math.PI * 2) / bars;

        // Halo respirant central
        const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 1.5);
        coreGradient.addColorStop(0, `hsla(260, 85%, 60%, ${0.15 + avgEnergy * 0.3})`);
        coreGradient.addColorStop(0.6, `hsla(180, 85%, 55%, ${0.08 + bassEnergy * 0.18})`);
        coreGradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();

        // Rayons du spectre
        for (let i = 0; i < bars; i++) {
          const angle = i * step + phase * 0.25;
          const bandVal = freqData[i % bufferLength] ? freqData[i % bufferLength] / 255 : (Math.sin(angle * 3 + phase) * 0.5 + 0.5) * avgEnergy;
          const barHeight = Math.max(4, bandVal * (Math.min(width, height) * 0.28) + bassEnergy * 25);

          const x1 = cx + Math.cos(angle) * baseRadius;
          const y1 = cy + Math.sin(angle) * baseRadius;
          const x2 = cx + Math.cos(angle) * (baseRadius + barHeight);
          const y2 = cy + Math.sin(angle) * (baseRadius + barHeight);

          const hue = 160 + (i / bars) * 160;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `hsla(${hue}, 90%, ${65 + bandVal * 25}%, ${0.35 + bandVal * 0.65})`;
          ctx.lineWidth = 3.5;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        // Anneau intérieur lumineux
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(200, 90%, 75%, ${0.45 + avgEnergy * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (mode === "horizon") {
        // --- 3. HORIZON D'ONDES BÉZIER (WAVEFORM RIBBONS) ---
        const layers = 4;
        const cy = height * 0.55;

        for (let l = 0; l < layers; l++) {
          const layerOffset = l * 0.6;
          const hue = 220 + l * 35;
          const waveHeight = (height * 0.14) * (1 - l * 0.18) * (1 + avgEnergy * 1.4);

          ctx.beginPath();
          ctx.moveTo(0, height);

          for (let x = 0; x <= width; x += 18) {
            const normalX = x / width;
            const dataIndex = Math.floor(normalX * (bufferLength - 1));
            const audioSample = timeData[dataIndex] ? (timeData[dataIndex] - 128) / 128 : Math.sin(normalX * Math.PI * 4 + phase);

            const y = cy + Math.sin(normalX * 6 + phase + layerOffset) * waveHeight * 0.7 + audioSample * waveHeight * 0.6 + l * 22;
            ctx.lineTo(x, y);
          }

          ctx.lineTo(width, height);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, cy - waveHeight, 0, height);
          grad.addColorStop(0, `hsla(${hue}, 85%, 65%, ${0.28 - l * 0.05 + avgEnergy * 0.15})`);
          grad.addColorStop(1, "transparent");

          ctx.fillStyle = grad;
          ctx.fill();

          ctx.lineWidth = 2.2 - l * 0.4;
          ctx.strokeStyle = `hsla(${hue}, 90%, 75%, ${0.6 - l * 0.1})`;
          ctx.stroke();
        }
      } else if (mode === "ripples") {
        // --- 4. ONDES ZEN HARMONIQUES (RIPPLES D'EAU) ---
        const cx = width / 2;
        const cy = height / 2;

        // Détection de battement (transient beat)
        if (bassEnergy > 0.45 && time - lastBeatTime > 420) {
          lastBeatTime = time;
          ripplesRef.current.push({
            x: cx + (Math.random() - 0.5) * 80,
            y: cy + (Math.random() - 0.5) * 80,
            radius: 5,
            maxRadius: Math.min(width, height) * (0.45 + Math.random() * 0.25),
            alpha: 0.8,
            color: accentColor,
          });
        }

        // Mise à jour et dessin des ondulations
        const ripples = ripplesRef.current;
        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i];
          r.radius += (r.maxRadius - r.radius) * 0.045 + 1.2;
          r.alpha *= 0.965;

          if (r.alpha < 0.01 || r.radius >= r.maxRadius) {
            ripples.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(16, 185, 129, ${r.alpha})`;
          ctx.lineWidth = Math.max(1, 3.5 * r.alpha);
          ctx.stroke();

          // Lueur secondaire
          ctx.beginPath();
          ctx.arc(r.x, r.y, Math.max(0, r.radius - 8), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(99, 102, 241, ${r.alpha * 0.45})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Ondes calmes continues au centre
        const centerRings = 5;
        for (let k = 1; k <= centerRings; k++) {
          const ringRad = ((phase * 40 * k) % (Math.min(width, height) * 0.4)) + 10;
          const progress = ringRad / (Math.min(width, height) * 0.4);
          const ringAlpha = (1 - progress) * (0.2 + avgEnergy * 0.4);

          ctx.beginPath();
          ctx.arc(cx, cy, ringRad, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(165, 80%, 65%, ${ringAlpha})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    // Suivi de la souris
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current.vx = x - mouseRef.current.lastX;
      mouseRef.current.vy = y - mouseRef.current.lastY;
      mouseRef.current.lastX = x;
      mouseRef.current.lastY = y;
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.isHovering = false;
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    canvas.addEventListener("mousemove", handleMouseMove, { passive: true });
    canvas.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mode, accentColor, isAudioActive, getAnalyser, initParticles, prefersReduced]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "pointer-events-auto h-full w-full select-none transition-opacity duration-700",
        className
      )}
      style={{ touchAction: "pan-y" }}
      aria-label={`Visualiseur audio interactif mode ${mode}`}
    />
  );
});
