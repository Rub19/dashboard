"use client";

import React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFloating, offset, flip, shift, autoUpdate, FloatingPortal } from "@floating-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { useLayer } from "@/components/LayerProvider";
import Slider from "@/components/ui/Slider";

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

const AMBIENCES = ["none", "rain", "pink", "drone", "white"] as const;

const AMBIENCE_ICONS: Record<string, string> = {
  none: "volume-x",
  rain: "cloud-rain",
  pink: "sparkles",
  drone: "disc",
  white: "wind",
};

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative h-5 w-9 rounded-xl transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform dark:bg-zinc-100 ${
            checked ? "left-5" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}

type RangeProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

function Range({ label, value, onChange }: RangeProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--foreground)]">{label}</span>
        <span className="text-[var(--muted)]">{value}%</span>
      </div>
      <Slider value={value} onChange={onChange} unit="%" className="w-full" aria-label={label} />
    </div>
  );
}

type ActionButtonProps = {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
};

function ActionButton({ icon, label, active, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-[10px] font-medium transition-colors hover:border-[var(--accent)] ${
        active ? "border-[var(--accent)] text-[var(--accent)]" : ""
      } backdrop-blur-[var(--panel-blur)]`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
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
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [ambience, setAmbience] = useState("none");

  const { refs, floatingStyles, isPositioned, placement, update: recalculate } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    placement: "top",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(12), flip({ padding: 8 }), shift({ padding: 8 })],
  });

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

  useLayoutEffect(() => {
    if (referenceRef) {
      refs.setReference(referenceRef);
      recalculate?.();
    }
  }, [referenceRef, refs, recalculate]);

  function setRefs(el: HTMLDivElement | null) {
    panelRef.current = el;
    refs.setFloating(el as unknown as HTMLElement);
    if (el) {
      recalculate?.();
    }
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
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
            style={{ ...floatingStyles, visibility: isPositioned ? "visible" : "hidden" }}
            className="z-[90] w-80 max-w-[calc(100vw-1rem)] overflow-hidden"
            role="dialog"
            aria-modal="false"
            aria-label={i18n("controlCenter")}
            data-control-center-placement={placement}
          >
            <div
              className="max-h-[calc(80vh-2.5rem)] space-y-4 overflow-y-auto rounded-lg border border-zinc-200 bg-white/90 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.12)] backdrop-blur-3xl dark:border-white/[0.08] dark:bg-zinc-950/90 dark:shadow-[0_16px_50px_rgba(0,0,0,0.7)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{i18n("controlCenter")}</h3>
                <button
                  type="button"
                  onClick={onClose}
                    aria-label={i18n("close")}
                  className="rounded p-1 text-[var(--muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)]"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>

              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  {i18n("controlCenterAnimations")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {UI_ANIMATIONS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => update({ uiAnimations: id })}
                      className={`rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1.5 text-[10px] font-medium transition-colors hover:border-[var(--accent)] ${
                        settings.uiAnimations === id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                      } backdrop-blur-[var(--panel-blur)]`}
                    >
                      {i18n(`uiAnimations${id.charAt(0).toUpperCase() + id.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  {i18n("quickActions")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <ActionButton icon="moon-star" label={i18n("zenMode")} active={settings.zenMode} onClick={handleZen} />
                  <ActionButton icon="focus" label={i18n("focus")} onClick={handleFocus} />
                  <ActionButton icon="bell" label={i18n("notifications")} onClick={handleNotifications} />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-2">
                <Toggle label={i18n("uiGlow")} checked={settings.uiGlow} onChange={(v) => update({ uiGlow: v })} />
                <Toggle
                  label={i18n("uiSoundFeedback")}
                  checked={settings.uiSoundFeedback}
                  onChange={(v) => update({ uiSoundFeedback: v })}
                />
                <Toggle
                  label={i18n("spotlight")}
                  checked={settings.spotlightEnabled}
                  onChange={(v) => update({ spotlightEnabled: v })}
                />
                <Toggle
                  label={i18n("ambientEffects")}
                  checked={settings.ambientEffectsEnabled}
                  onChange={(v) => update({ ambientEffectsEnabled: v })}
                />
                <Toggle
                  label={i18n("interfaceBlur")}
                  checked={settings.interfaceBlurEnabled}
                  onChange={(v) => update({ interfaceBlurEnabled: v })}
                />
              </section>

              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{i18n("soundPack")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {SOUND_PACKS.map((pack) => (
                    <button
                      key={pack}
                      type="button"
                      onClick={() => update({ soundPack: pack })}
                      className={`flex flex-col items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-[10px] font-medium transition-colors hover:border-[var(--accent)] ${
                        settings.soundPack === pack ? "border-[var(--accent)] text-[var(--accent)]" : ""
                      } backdrop-blur-[var(--panel-blur)]`}
                    >
                      <Icon name={PACK_ICONS[pack] || "music"} className="h-4 w-4" />
                      {i18n(`soundPack${pack.charAt(0).toUpperCase() + pack.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <Toggle
                  label={i18n("masterVolume")}
                  checked={settings.masterVolume}
                  onChange={(v) => update({ masterVolume: v })}
                />
                <Range label={i18n("soundVolume")} value={settings.soundVolume} onChange={(v) => update({ soundVolume: v })} />
              </section>

              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{i18n("ambience")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {AMBIENCES.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAmbience(id)}
                      className={`flex flex-col items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-[10px] font-medium transition-colors hover:border-[var(--accent)] ${
                        ambience === id ? "border-[var(--accent)] text-[var(--accent)]" : ""
                      } backdrop-blur-[var(--panel-blur)]`}
                    >
                      <Icon name={AMBIENCE_ICONS[id] || "disc"} className="h-4 w-4" />
                      {i18n(`ambience${id.charAt(0).toUpperCase() + id.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </section>

              <Link
                href="/settings/"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-zinc-50 transition-opacity hover:opacity-90"
              >
                <Icon name="settings" className="h-4 w-4" />
                {i18n("openSettings")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
