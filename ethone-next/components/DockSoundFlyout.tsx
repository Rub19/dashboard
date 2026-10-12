"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX } from "@/components/icons/ph";
import { useSound, type SoundAmbient } from "@/lib/sound";
import { hapticLightImpact } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import VolumeSlider from "@/components/VolumeSlider";
import { Icon } from "@/lib/icons";

const AMBIENT_NAMES: Record<string, string> = {
  rain: "Pluie",
  storm: "Orage",
  forest: "Forêt",
  ocean: "Océan",
  fireplace: "Feu de bois",
  cafe: "Café",
  wind: "Vent",
  blizzard: "Blizzard",
  night: "Nuit",
  train: "Train",
  city: "Ville",
  library: "Bibliothèque",
  space: "Espace",
  nature: "Nature",
  pink: "Bruit Rose",
  brown: "Bruit Brun",
  white: "Bruit Blanc",
};

export default function DockSoundFlyout() {
  const router = useRouter();
  const {
    ambientSound,
    ambientLayers,
    playAmbient,
    stopAmbient,
    setAmbientVolume,
    setAmbientLayerVolume,
  } = useSound();

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [soundVolume, setSoundVolume] = useState(65);
  const [pos, setPos] = useState({ left: 0, bottom: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const activeLayers = useMemo(() => {
    return Object.keys(ambientLayers) as SoundAmbient[];
  }, [ambientLayers]);

  const isPlaying = ambientSound !== "none" || activeLayers.length > 0;

  const activeTitle = useMemo(() => {
    if (activeLayers.length > 1) {
      return activeLayers.map((l) => AMBIENT_NAMES[l] || l).join(" & ");
    }
    if (ambientSound !== "none") {
      return AMBIENT_NAMES[ambientSound] || ambientSound;
    }
    if (activeLayers.length === 1) {
      return AMBIENT_NAMES[activeLayers[0]] || activeLayers[0];
    }
    return "Ambiance inactive";
  }, [ambientSound, activeLayers]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const popoverWidth = isMobile ? Math.min(window.innerWidth - 32, 300) : 300;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, left));
    const bottom = window.innerHeight - rect.top + 12;
    setPos({ left, bottom });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    hapticLightImpact();
    setOpen((prev) => !prev);
  };

  const handleVolumeChange = (newVol: number) => {
    setSoundVolume(newVol);
    setAmbientVolume(newVol);
    if (ambientSound !== "none") {
      setAmbientLayerVolume(ambientSound, newVol);
    }
    activeLayers.forEach((layer) => {
      setAmbientLayerVolume(layer, newVol);
    });
  };

  const handleStop = () => {
    hapticLightImpact();
    stopAmbient();
  };

  const handlePlayPreset = (preset: SoundAmbient) => {
    hapticLightImpact();
    playAmbient(preset, soundVolume || 65);
  };

  return (
    <>
      <div
        className="relative flex flex-col items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <AnimatePresence>
          {hovered && !open && (
            <motion.div
              initial={{ opacity: 0, y: 4, x: "-50%", scale: 0.92 }}
              animate={{ opacity: 1, y: -8, x: "-50%", scale: 1 }}
              exit={{ opacity: 0, y: 2, x: "-50%", scale: 0.94 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="pointer-events-none absolute -top-9 left-1/2 z-50 whitespace-nowrap rounded-lg border border-[var(--panel-border)] bg-[var(--bg-surface,var(--panel-bg))]/95 px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] shadow-xl backdrop-blur-xl select-none"
            >
              {isPlaying ? `${activeTitle} (${soundVolume}%)` : "Ambiance Sonore"}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          whileHover={{ scale: 1.16, y: -3 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 450, damping: 22 }}
          aria-label="Ambiance sonore"
          aria-expanded={open}
          className={cn(
            "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl transition-all duration-200 select-none",
            isPlaying
              ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : open
              ? "border border-[var(--panel-border)] bg-[var(--text-primary)]/10 text-[var(--text-primary)]"
              : "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.07] hover:text-[var(--text-primary)]"
          )}
        >
          {isPlaying ? (
            <div className="relative flex items-center justify-center">
              <Icon name="waveform" pack="phosphor" className="h-4.5 w-4.5 animate-pulse text-emerald-400" />
              <span className="absolute -bottom-1 -right-1 flex h-2 w-2 items-center justify-center">
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
            </div>
          ) : (
            <Volume2 className="h-4.5 w-4.5 transition-transform" />
          )}
        </motion.button>

        {isPlaying && (
          <span
            className="absolute -bottom-1 h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
            aria-hidden="true"
          />
        )}
      </div>

      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              style={{
                position: "fixed",
                left: `${pos.left}px`,
                bottom: `${pos.bottom}px`,
                zIndex: "calc(var(--z-dock, 90) + 10)",
              }}
              className="w-[min(92vw,300px)] select-none outline-none"
            >
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0c1017]/95 dark:bg-[#070b13]/98 p-4 text-[var(--text-primary)] shadow-[0_24px_60px_-10px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-3xl">
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent blur-3xl opacity-80"
                  aria-hidden="true"
                />

                <div className="relative space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                        <Icon name="waveform" pack="phosphor" className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Ambiance Sonore
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPlaying && (
                        <div className="flex items-end gap-0.5 h-3 px-1 mr-0.5" aria-hidden="true">
                          <motion.span
                            animate={{ scaleY: [0.3, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                            className="w-0.5 h-full origin-bottom rounded-full bg-emerald-400"
                          />
                          <motion.span
                            animate={{ scaleY: [0.7, 0.2, 0.9] }}
                            transition={{ repeat: Infinity, duration: 0.65, ease: "easeInOut", delay: 0.1 }}
                            className="w-0.5 h-full origin-bottom rounded-full bg-emerald-400"
                          />
                          <motion.span
                            animate={{ scaleY: [0.2, 0.8, 0.3] }}
                            transition={{ repeat: Infinity, duration: 0.75, ease: "easeInOut", delay: 0.2 }}
                            className="w-0.5 h-full origin-bottom rounded-full bg-emerald-400"
                          />
                          <motion.span
                            animate={{ scaleY: [0.5, 0.3, 1] }}
                            transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut", delay: 0.15 }}
                            className="w-0.5 h-full origin-bottom rounded-full bg-emerald-400"
                          />
                        </div>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          isPlaying
                            ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                            : "border border-white/[0.08] bg-white/[0.04] text-[var(--text-muted)]"
                        )}
                      >
                        {isPlaying ? "En cours" : "Arrêté"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-[var(--text-muted)] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                        aria-label="Fermer"
                      >
                        <Icon pack="phosphor" name="close" className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">
                        {activeTitle}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                        {isPlaying
                          ? `${activeLayers.length || 1} source(s) en boucle fluide`
                          : "Générateur audio apaisant"}
                      </p>
                    </div>
                    {isPlaying && (
                      <button
                        type="button"
                        onClick={handleStop}
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/25 transition-all cursor-pointer active:scale-95"
                        title="Couper l'ambiance"
                      >
                        <VolumeX className="h-3.5 w-3.5" />
                        <span>Couper</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                      <span>Volume d&apos;ambiance</span>
                      <span className="font-mono text-xs text-white tabular-nums">
                        {soundVolume}%
                      </span>
                    </div>
                    <VolumeSlider
                      value={soundVolume}
                      onChange={handleVolumeChange}
                      data-testid="dock-sound-volume"
                    />
                  </div>

                  {!isPlaying && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Lancer une ambiance
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePlayPreset("rain")}
                          className="flex items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-1.5 text-xs font-semibold text-white hover:bg-white/[0.09] transition-all cursor-pointer active:scale-95"
                        >
                          🌧 Pluie
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayPreset("ocean")}
                          className="flex items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-1.5 text-xs font-semibold text-white hover:bg-white/[0.09] transition-all cursor-pointer active:scale-95"
                        >
                          🌊 Océan
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayPreset("wind")}
                          className="flex items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-1.5 text-xs font-semibold text-white hover:bg-white/[0.09] transition-all cursor-pointer active:scale-95"
                        >
                          🍃 Vent
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push("/soundscape");
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <Icon name="arrow-square-out" pack="phosphor" className="h-3.5 w-3.5" />
                      <span>Ouvrir Studio Soundscape</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
