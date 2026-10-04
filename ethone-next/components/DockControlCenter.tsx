"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
  silent: "helpCircle",
};

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

function AppleToggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        hapticLightImpact();
        onChange(!checked);
      }}
      className="group flex w-full items-center justify-between gap-3 py-1.5 px-2 rounded-xl cursor-pointer select-none transition-colors hover:bg-white/[0.04] text-left"
    >
      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
        {label}
      </span>

      <span
        className={cn(
          "relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-out",
          checked
            ? "bg-[var(--accent-primary)] shadow-[0_0_12px_var(--glow-color)]"
            : "bg-white/[0.14] group-hover:bg-white/[0.2]"
        )}
      >
        <motion.span
          className="inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm"
          initial={false}
          animate={{
            x: checked ? 18 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 600,
            damping: 35,
          }}
        />
      </span>
    </button>
  );
}

type AppleVolumeSliderProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

function AppleVolumeSlider({ label, value, onChange }: AppleVolumeSliderProps) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = Math.max(0, Math.min(100, value));

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
      hapticLightImpact();
      onChange(Math.min(100, value + 5));
    } else if (["ArrowLeft", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      hapticLightImpact();
      onChange(Math.max(0, value - 5));
    }
  };

  return (
    <div className="space-y-2 pt-0.5">
      <div className="flex items-center justify-between text-xs px-2">
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
        <span className="font-mono text-[var(--text-muted)] text-[11px] tabular-nums">
          {pct}%
        </span>
      </div>

      <div className="flex items-center gap-3 px-2">
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
          className="relative h-2 flex-1 rounded-full bg-black/50 border border-white/[0.08] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
        >
          {/* Active filled track */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--glow-color)]",
              dragging ? "transition-none" : "transition-[width] duration-75"
            )}
            style={{ width: `${pct}%` }}
          />

          {/* Draggable Knob */}
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-transform",
              "h-4 w-4 border-2 border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30",
              dragging || hovered ? "scale-125 shadow-[0_0_12px_var(--glow-color)]" : "scale-100"
            )}
            style={{ left: `${pct}%` }}
          />
        </div>

        <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums w-8 text-right">
          {pct}%
        </span>
      </div>
    </div>
  );
}

type QuickActionCardProps = {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
};

function QuickActionCard({ icon, label, active, onClick }: QuickActionCardProps) {
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
        "group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center cursor-pointer overflow-hidden transition-colors",
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
    }
    onClose();
  }

  return (
    <FloatingPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={setRefs}
            initial={{ opacity: 0, y: 18, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 12, x: "-50%", scale: 0.96 }}
            transition={{ type: "spring", stiffness: 440, damping: 28, mass: 0.75 }}
            style={{ transformOrigin: "bottom center" }}
            className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 z-[var(--z-popover)] w-88 sm:w-[380px] max-w-[calc(100vw-1.5rem)] overflow-hidden pointer-events-auto"
            role="dialog"
            aria-modal="false"
            aria-label={i18n("controlCenter")}
          >
            <div className="relative max-h-[min(82vh-2.5rem,640px)] space-y-3.5 overflow-y-auto no-scrollbar rounded-3xl border border-white/[0.09] bg-[#0c1017]/92 dark:bg-[#080c14]/95 p-4 text-[var(--text-primary)] shadow-[0_28px_60px_-10px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-3xl">
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
                <LayoutGroup id="cc-animations-group">
                  <div className="relative flex p-1 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md gap-1">
                    {UI_ANIMATIONS.map((id) => {
                      const isSelected = settings.uiAnimations === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            hapticLightImpact();
                            update({
                              uiAnimations: id,
                              reducedMotion: id === "reduced",
                            });
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
                </LayoutGroup>
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
                    active={settings.zenMode}
                    onClick={handleZen}
                  />
                  <QuickActionCard
                    icon="focus"
                    label={i18n("focus")}
                    onClick={handleFocus}
                  />
                  <QuickActionCard
                    icon="bell"
                    label={i18n("notifications")}
                    onClick={handleNotifications}
                  />
                </div>
              </section>

              {/* Section 3: Interface & Display Switches */}
              <section className="space-y-0.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2 backdrop-blur-md">
                <AppleToggle
                  label={i18n("uiGlow")}
                  checked={settings.uiGlow}
                  onChange={(v) => update({ uiGlow: v })}
                />
                <AppleToggle
                  label={i18n("uiSoundFeedback")}
                  checked={settings.uiSoundFeedback}
                  onChange={(v) => update({ uiSoundFeedback: v })}
                />
                <AppleToggle
                  label={i18n("spotlight")}
                  checked={settings.spotlightEnabled}
                  onChange={(v) => update({ spotlightEnabled: v })}
                />
                <AppleToggle
                  label={i18n("ambientEffects")}
                  checked={settings.ambientEffectsEnabled}
                  onChange={(v) => update({ ambientEffectsEnabled: v })}
                />
                <AppleToggle
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
                          "group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 text-[10px] font-medium cursor-pointer transition-colors",
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
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* Section 5: Volume Section (Master toggle + Smooth range slider) */}
              <section className="space-y-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2.5 backdrop-blur-md">
                <AppleToggle
                  label={i18n("masterVolume")}
                  checked={settings.masterVolume}
                  onChange={(v) => update({ masterVolume: v })}
                />
                <AppleVolumeSlider
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
