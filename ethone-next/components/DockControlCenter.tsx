"use client";

import React from "react";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import { useLayer } from "@/components/LayerProvider";
import Slider from "@/components/ui/Slider";
import { useSound } from "@/lib/sound";
import AmbientSoundControl from "@/components/AmbientSoundControl";
import type { SoundPack } from "@/lib/settings";

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
  checked: boolean;
  onChange: (v: boolean) => void;
};

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer py-0.5">
      <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
          checked ? "bg-[var(--accent-primary)]" : "bg-white/15"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
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
        <span className="text-[var(--text-primary)]">{label}</span>
        <span className="text-[var(--text-muted)] font-mono">{value}%</span>
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
      className={`flex flex-col items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-white/[0.03] p-2.5 text-[10px] font-medium transition-all hover:bg-white/[0.08] hover:border-[var(--accent-primary)]/40 active:scale-95 cursor-pointer ${
        active ? "border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-sm" : "text-[var(--text-primary)]"
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      <span className="truncate w-full text-center">{label}</span>
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
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.75 }}
            style={{ transformOrigin: "bottom center" }}
            className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 z-[var(--z-popover)] w-84 max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-hidden pointer-events-auto"
            role="dialog"
            aria-modal="false"
            aria-label={i18n("controlCenter")}
          >
            <div className="max-h-[calc(80vh-2.5rem)] space-y-4 overflow-y-auto no-scrollbar rounded-2xl border border-[var(--panel-border)] bg-[var(--bg-surface)]/92 dark:bg-[#090d16]/92 p-4 text-[var(--text-primary)] shadow-[0_24px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                    <Icon name="sliders" className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    {i18n("controlCenter")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={i18n("close")}
                  className="rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>

              <section className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {i18n("controlCenterAnimations")}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {UI_ANIMATIONS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => update({ uiAnimations: id })}
                      className={`rounded-xl border border-[var(--panel-border)] bg-white/[0.03] px-2 py-1.5 text-[10px] font-medium transition-all hover:bg-white/[0.08] active:scale-95 cursor-pointer ${
                        settings.uiAnimations === id
                          ? "border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-sm"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {i18n(`uiAnimations${id.charAt(0).toUpperCase() + id.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {i18n("quickActions")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <ActionButton icon="moon-star" label={i18n("zenMode")} active={settings.zenMode} onClick={handleZen} />
                  <ActionButton icon="focus" label={i18n("focus")} onClick={handleFocus} />
                  <ActionButton icon="bell" label={i18n("notifications")} onClick={handleNotifications} />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-1.5 rounded-xl border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
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

              <section className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{i18n("soundPack")}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {SOUND_PACKS.map((pack) => (
                    <button
                      key={pack}
                      type="button"
                      onClick={() => {
                        update({ soundPack: pack as SoundPack });
                        play("click", pack);
                      }}
                      className={`flex flex-col items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-white/[0.03] p-2 text-[10px] font-medium transition-all hover:bg-white/[0.08] active:scale-95 cursor-pointer ${
                        settings.soundPack === pack
                          ? "border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-sm"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      <Icon name={PACK_ICONS[pack] || "music"} className="h-4 w-4" />
                      <span className="truncate w-full text-center">
                        {i18n(`soundPack${pack.charAt(0).toUpperCase() + pack.slice(1)}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-[var(--panel-border)] bg-white/[0.02] p-2.5">
                <Toggle
                  label={i18n("masterVolume")}
                  checked={settings.masterVolume}
                  onChange={(v) => update({ masterVolume: v })}
                />
                <Range label={i18n("soundVolume")} value={settings.soundVolume} onChange={(v) => update({ soundVolume: v })} />
              </section>

              <section className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{i18n("ambience")}</p>
                <AmbientSoundControl compact />
              </section>

              <Link
                href="/settings/"
                onClick={onClose}
                className="group flex w-full items-center justify-between rounded-xl border border-[var(--panel-border)] bg-white/[0.05] hover:bg-white/[0.1] hover:border-white/20 px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all duration-150 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <Icon name="settings" className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                  <span>{i18n("openSettings")}</span>
                </div>
                <Icon name="arrowRight" className="h-4 w-4 text-[var(--text-muted)] transition-transform duration-150 group-hover:translate-x-1 group-hover:text-[var(--text-primary)]" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
