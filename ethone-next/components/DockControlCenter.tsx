"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { useLayer } from "@/components/LayerProvider";
import { useSound } from "@/lib/sound";
import AmbientSoundControl from "@/components/AmbientSoundControl";
import { hapticLightImpact } from "@/lib/haptics";
import type { SoundPack } from "@/lib/settings";
import { Volume2, VolumeX } from "@/components/icons/ph";
import { cn } from "@/lib/utils";

const UI_ANIMATIONS = ["smooth", "snappy", "reduced"] as const;

const SOUND_PACKS = [
  "ethone",
  "minimal",
  "classic",
  "apple-inspired",
  "cyber-pulse",
  "silent",
] as const;

const PACK_ICONS: Record<string, string> = {
  ethone: "music",
  minimal: "minus",
  classic: "disc",
  "apple-inspired": "heart",
  "cyber-pulse": "zap",
  silent: "volume-x",
};

type ToggleProps = {
  label: string;
  icon?: string;
  iconColor?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

function AppleToggle({ label, icon, iconColor, checked, onChange }: ToggleProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        hapticLightImpact();
        onChange(!checked);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          hapticLightImpact();
          onChange(!checked);
        }
      }}
      className="group flex items-center justify-between gap-3 py-1 px-1.5 rounded-xl cursor-pointer select-none transition-colors hover:bg-white/[0.04]"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors",
              checked
                ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-[0_0_10px_var(--glow-color)]"
                : "border-white/[0.08] bg-white/[0.04] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
            )}
          >
            <Icon name={icon} className={cn("h-3.5 w-3.5", iconColor && !checked ? iconColor : "")} />
          </div>
        )}
        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
          {label}
        </span>
      </div>

      <div
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-all duration-200 ease-out",
          checked
            ? "bg-[var(--accent-primary)] shadow-[0_0_14px_var(--glow-color)]"
            : "bg-white/[0.14] hover:bg-white/[0.2]"
        )}
        aria-pressed={checked}
        role="switch"
        aria-label={label}
      >
        <motion.span
          className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
          animate={{
            x: checked ? 20 : 0,
            scale: [1, 0.94, 1],
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
            mass: 0.6,
          }}
        />
      </div>
    </div>
  );
}

type CapsuleVolumeProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

function CapsuleVolumeSlider({ label, value, onChange }: CapsuleVolumeProps) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastNonZeroRef = useRef(value || 75);

  const pct = Math.max(0, Math.min(100, value));
  const isMuted = value === 0;

  useEffect(() => {
    if (value > 0) lastNonZeroRef.current = value;
  }, [value]);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      onChange(Math.round(next));
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
    hapticLightImpact();
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowRight", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      onChange(Math.min(100, value + 5));
    } else if (["ArrowLeft", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      onChange(Math.max(0, value - 5));
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLightImpact();
    onChange(isMuted ? lastNonZeroRef.current || 75 : 0);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs px-0.5">
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
        <span className="font-mono text-[var(--text-muted)] text-[11px] tabular-nums">
          {pct}%
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative h-9 w-full rounded-2xl bg-black/40 border border-white/[0.08] overflow-hidden select-none cursor-pointer",
          "shadow-inner backdrop-blur-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
        )}
      >
        {/* Dynamic gradient fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--accent-primary)]/80 via-[var(--accent-primary)] to-[var(--accent-primary)] rounded-2xl shadow-[0_0_15px_var(--glow-color)]"
          style={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
        />

        {/* Ambient track texture */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

        {/* Content over slider */}
        <div className="relative z-10 flex h-full items-center justify-between px-3 pointer-events-none">
          <button
            type="button"
            onClick={toggleMute}
            className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-lg text-white/90 hover:text-white transition-transform active:scale-90"
            aria-label={isMuted ? "Activer le son" : "Couper le son"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 drop-shadow" />
            ) : (
              <Volume2 className="h-4 w-4 drop-shadow" />
            )}
          </button>

          <span
            className={cn(
              "font-mono text-xs font-bold tabular-nums drop-shadow transition-opacity",
              pct < 50 ? "text-white/80" : "text-white"
            )}
          >
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}

type QuickActionCardProps = {
  icon: string;
  label: string;
  subtitle?: string;
  active?: boolean;
  onClick: () => void;
};

function QuickActionCard({
  icon,
  label,
  subtitle,
  active,
  onClick,
}: QuickActionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => {
        hapticLightImpact();
        onClick();
      }}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 text-center transition-all cursor-pointer overflow-hidden",
        active
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-[0_0_18px_-3px_var(--glow-color)]"
          : "border-white/[0.08] bg-white/[0.03] text-[var(--text-primary)] hover:border-white/[0.16] hover:bg-white/[0.07]"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
          active
            ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
            : "bg-white/[0.06] text-zinc-300"
        )}
      >
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <span className="w-full truncate text-[11px] font-semibold leading-tight">
        {label}
      </span>
      {subtitle && (
        <span className="w-full truncate text-[9px] font-medium text-[var(--text-muted)] opacity-80">
          {subtitle}
        </span>
      )}
    </motion.button>
  );
}

export default function DockControlCenter({
  open,
  onClose,
  referenceRef,
}: {
  open: boolean;
  onClose: () => void;
  referenceRef: HTMLElement | null;
}) {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { play } = useSound();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useLayer(open, onClose, {
    boundary: panelRef,
    anchor: referenceRef,
    kind: "popover",
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnResize: true,
    closeOnScroll: true,
    initialFocus: true,
    trapFocus: false,
  });

  function setRefs(el: HTMLDivElement | null) {
    panelRef.current = el;
  }

  function handleZen() {
    update({ zenMode: !settings.zenMode });
    onClose();
  }

  function handleFocus() {
    router.push("/focus/");
    onClose();
  }

  function handleNotifications() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("v8:open-notifications"));
      window.dispatchEvent(new CustomEvent("ethone:open-notifications"));
    }
    onClose();
  }

  return (
    <FloatingPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={setRefs}
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 440, damping: 28, mass: 0.75 }}
            style={{ transformOrigin: "bottom center" }}
            className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 z-[var(--z-popover)] w-92 sm:w-96 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 overflow-hidden pointer-events-auto"
            role="dialog"
            aria-modal="false"
            aria-label={i18n("controlCenter")}
          >
            <div className="relative max-h-[calc(82vh-2.5rem)] space-y-4 overflow-y-auto no-scrollbar rounded-3xl border border-white/[0.09] bg-[#0c1017]/90 dark:bg-[#080c14]/94 p-4.5 text-[var(--text-primary)] shadow-[0_28px_60px_-10px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-3xl">
              {/* Dynamic ambient background aura */}
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gradient-to-br from-violet-500/20 via-[var(--accent-primary)]/15 to-transparent blur-3xl opacity-70 animate-pulse"
                style={{ animationDuration: "6s" }}
                aria-hidden="true"
              />

              {/* Header */}
              <div className="relative flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-[0_0_12px_var(--glow-color)]">
                    <Icon name="sliders" className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--text-primary)]">
                      {i18n("controlCenter")}
                    </h3>
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ scale: 1.12, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={i18n("close")}
                  className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              {/* Section 1: UI Animations Segmented Pill */}
              <section className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5">
                  {i18n("controlCenterAnimations")}
                </p>
                <div className="relative flex p-1 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md gap-1">
                  {UI_ANIMATIONS.map((id) => {
                    const isSelected = settings.uiAnimations === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          hapticLightImpact();
                          update({ uiAnimations: id });
                        }}
                        className={cn(
                          "relative flex-1 py-1.5 px-2 text-[11px] font-semibold text-center rounded-xl transition-colors cursor-pointer select-none z-10",
                          isSelected
                            ? "text-white"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="cc-active-pill"
                            className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/[0.18] shadow-sm backdrop-blur-sm"
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        )}
                        <span className="relative z-10 truncate">
                          {i18n(`uiAnimations${id.charAt(0).toUpperCase() + id.slice(1)}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Section 2: Bento Quick Actions */}
              <section className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5">
                  {i18n("quickActions")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <QuickActionCard
                    icon="moon-star"
                    label={i18n("zenMode")}
                    subtitle={settings.zenMode ? "Actif" : "Inactif"}
                    active={settings.zenMode}
                    onClick={handleZen}
                  />
                  <QuickActionCard
                    icon="focus"
                    label={i18n("focus")}
                    subtitle="Lancer"
                    onClick={handleFocus}
                  />
                  <QuickActionCard
                    icon="bell"
                    label={i18n("notifications")}
                    subtitle="Centre"
                    onClick={handleNotifications}
                  />
                </div>
              </section>

              {/* Section 3: Interface & Display Switches Bento */}
              <section className="space-y-0.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2 backdrop-blur-md">
                <AppleToggle
                  icon="sparkles"
                  iconColor="text-pink-400"
                  label={i18n("uiGlow")}
                  checked={settings.uiGlow}
                  onChange={(v) => update({ uiGlow: v })}
                />
                <AppleToggle
                  icon="volume-2"
                  iconColor="text-cyan-400"
                  label={i18n("uiSoundFeedback")}
                  checked={settings.uiSoundFeedback}
                  onChange={(v) => update({ uiSoundFeedback: v })}
                />
                <AppleToggle
                  icon="search"
                  iconColor="text-sky-400"
                  label={i18n("spotlight")}
                  checked={settings.spotlightEnabled}
                  onChange={(v) => update({ spotlightEnabled: v })}
                />
                <AppleToggle
                  icon="sun"
                  iconColor="text-amber-400"
                  label={i18n("ambientEffects")}
                  checked={settings.ambientEffectsEnabled}
                  onChange={(v) => update({ ambientEffectsEnabled: v })}
                />
                <AppleToggle
                  icon="layers"
                  iconColor="text-indigo-400"
                  label={i18n("interfaceBlur")}
                  checked={settings.interfaceBlurEnabled}
                  onChange={(v) => update({ interfaceBlurEnabled: v })}
                />
              </section>

              {/* Section 4: Sound Pack Bento */}
              <section className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5">
                  {i18n("soundPack")}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {SOUND_PACKS.map((pack) => {
                    const active = settings.soundPack === pack;
                    return (
                      <motion.button
                        key={pack}
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        onClick={() => {
                          hapticLightImpact();
                          update({ soundPack: pack as SoundPack });
                          play("click", pack);
                        }}
                        className={cn(
                          "group relative flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] font-medium transition-all cursor-pointer",
                          active
                            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-[0_0_14px_-2px_var(--glow-color)]"
                            : "border-white/[0.08] bg-white/[0.03] text-[var(--text-primary)] hover:border-white/[0.14] hover:bg-white/[0.06]"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
                            active
                              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                              : "bg-white/[0.05] text-zinc-300"
                          )}
                        >
                          <Icon name={PACK_ICONS[pack] || "music"} className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate w-full text-center font-semibold">
                          {i18n(`soundPack${pack.charAt(0).toUpperCase() + pack.slice(1)}`)}
                        </span>
                        {active && (
                          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_6px_var(--accent-primary)]" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* Section 5: Volume Bento (Master toggle + Capsule Slider) */}
              <section className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-md">
                <AppleToggle
                  icon="speaker"
                  iconColor="text-rose-400"
                  label={i18n("masterVolume")}
                  checked={settings.masterVolume}
                  onChange={(v) => update({ masterVolume: v })}
                />
                <CapsuleVolumeSlider
                  label={i18n("soundVolume")}
                  value={settings.soundVolume}
                  onChange={(v) => update({ soundVolume: v })}
                />
              </section>

              {/* Section 6: Ambient Soundscapes */}
              <section className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-0.5">
                  {i18n("ambience")}
                </p>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2 backdrop-blur-md">
                  <AmbientSoundControl compact />
                </div>
              </section>

              {/* Section 7: Footer link to Settings */}
              <Link
                href="/settings/"
                onClick={onClose}
                className="group flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.18] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all duration-150 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300 group-hover:text-white transition-colors">
                    <Icon
                      name="settings"
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45"
                    />
                  </div>
                  <span>{i18n("openSettings")}</span>
                </div>
                <Icon
                  name="arrowRight"
                  className="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white"
                />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
