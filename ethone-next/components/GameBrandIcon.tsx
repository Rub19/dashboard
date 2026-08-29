"use client";

import { memo } from "react";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

type GameBrandIconProps = {
  name?: string;
  className?: string;
};

export const GameBrandIcon = memo(function GameBrandIcon({
  name = "",
  className = "h-4 w-4",
}: GameBrandIconProps) {
  const clean = name.toLowerCase().trim();

  // Palworld (Official Pal Sphere & Pal Emblem)
  if (clean.includes("palworld")) {
    return (
      <svg viewBox="0 0 32 32" fill="none" className={cn("shrink-0", className)}>
        <defs>
          <linearGradient id="palworldSphereGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="palworldGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <radialGradient id="palworldCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </radialGradient>
        </defs>
        {/* Outer Golden Wings & Rim */}
        <circle cx="16" cy="16" r="14" fill="url(#palworldSphereGrad)" stroke="url(#palworldGoldGrad)" strokeWidth="2" />
        {/* Central Golden Cross Lattice */}
        <path d="M16 2v28M2 16h28" stroke="url(#palworldGoldGrad)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Wing Accents */}
        <path d="M8 8c3 2 5 5 5 8s-2 6-5 8M24 8c-3 2-5 5-5 8s2 6 5 8" stroke="url(#palworldGoldGrad)" strokeWidth="1.8" strokeLinecap="round" />
        {/* Glowing Center Pal Core */}
        <circle cx="16" cy="16" r="5" fill="url(#palworldCoreGlow)" stroke="#ffffff" strokeWidth="1" />
        <circle cx="16" cy="16" r="2" fill="#ffffff" />
      </svg>
    );
  }

  // Valorant
  if (clean.includes("valorant")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-rose-500", className)}>
        <path d="M2.25 4.5l8.75 15h4.25L6.5 4.5H2.25zm15.5 0l4 6.75h-4.25l-4-6.75h4.25z" />
      </svg>
    );
  }

  // League of Legends
  if (clean.includes("league of legends") || clean === "lol") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-yellow-500", className)}>
        <path d="M4 3h4v14h8v4H4V3zm14 7h2v7h-2v-7zm-4 4h2v3h-2v-3z" />
      </svg>
    );
  }

  // Minecraft
  if (clean.includes("minecraft")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-emerald-500", className)}>
        <path d="M4 4h16v16H4V4zm2 2v4h4V6H6zm6 0v4h6V6h-6zm-6 6v6h6v-6H6zm8 0v6h4v-6h-4z" />
      </svg>
    );
  }

  // Counter-Strike / CS:GO / CS2
  if (clean.includes("counter-strike") || clean.includes("cs:go") || clean.includes("cs2") || clean === "cs") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-amber-500", className)}>
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
      </svg>
    );
  }

  // Fortnite
  if (clean.includes("fortnite")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-sky-400", className)}>
        <path d="M5 3h14v4H9v4h8v4H9v6H5V3z" />
      </svg>
    );
  }

  // Apex Legends
  if (clean.includes("apex")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-red-500", className)}>
        <path d="M12 2L2 19.5h5.5l2-4.5h5l2 4.5H22L12 2zm0 6.5l1.6 3.5h-3.2L12 8.5z" />
      </svg>
    );
  }

  // GTA / Grand Theft Auto
  if (clean.includes("grand theft auto") || clean.includes("gta")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-emerald-400", className)}>
        <path d="M3 5h8v4H7v6h4v4H3V5zm10 0h8v4h-4v2h4v8h-8v-4h4v-2h-4V5z" />
      </svg>
    );
  }

  // Rocket League
  if (clean.includes("rocket league")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-blue-400", className)}>
        <path d="M12 2.5C7.5 5 4 9 4 14c0 4 3 7.5 8 7.5s8-3.5 8-7.5c0-5-3.5-9-8-11.5zm0 15c-2.5 0-4.5-1.5-4.5-4 0-2 1.5-4 4.5-5.5 3 1.5 4.5 3.5 4.5 5.5 0 2.5-2 4-4.5 4z" />
      </svg>
    );
  }

  // Overwatch
  if (clean.includes("overwatch")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-orange-400", className)}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.9 12.8c-1.3 2.1-3.6 3.5-6.2 3.7l2.1-5.6 4.1 1.9zm-13.8 0l4.1-1.9 2.1 5.6c-2.6-.2-4.9-1.6-6.2-3.7zM12 4.1c2.1 0 4 .8 5.4 2.1l-3.3 2.7c-.6-.4-1.3-.6-2.1-.6s-1.5.2-2.1.6L6.6 6.2c1.4-1.3 3.3-2.1 5.4-2.1z" />
      </svg>
    );
  }

  // Roblox
  if (clean.includes("roblox")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-red-500", className)}>
        <path d="M5.3 2.7l16 4.3-4.3 16-16-4.3 4.3-16zm6.2 7.7l-1.6.4.4 1.6 1.6-.4-.4-1.6z" />
      </svg>
    );
  }

  // Genshin Impact
  if (clean.includes("genshin") || clean.includes("honkai")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-teal-400", className)}>
        <path d="M12 2l2.4 6.8H21l-5.6 4.2 2.1 6.8L12 15.6l-5.5 4.2 2.1-6.8L3 8.8h6.6L12 2z" />
      </svg>
    );
  }

  // Elden Ring / Dark Souls
  if (clean.includes("elden ring") || clean.includes("dark souls")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-amber-300", className)}>
        <path d="M12 2C8.7 2 6 4.7 6 8c0 1.9.9 3.6 2.3 4.7C6.9 13.8 6 15.8 6 18c0 3.3 2.7 6 6 6s6-2.7 6-6c0-2.2-.9-4.2-2.3-5.3 1.4-1.1 2.3-2.8 2.3-4.7 0-3.3-2.7-6-6-6zm0 2c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4zm0 10c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z" />
      </svg>
    );
  }

  // Cyberpunk
  if (clean.includes("cyberpunk")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-yellow-400", className)}>
        <path d="M3 4h18v4H7v2h14v10H3V4zm4 8h10v4H7v-4z" />
      </svg>
    );
  }

  // Default fallback
  return <Gamepad2 className={cn("text-violet-400", className)} />;
});

export default GameBrandIcon;
