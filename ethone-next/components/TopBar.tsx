"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import {
  Palette,
  Timer,
  Eye,
  EyeOff,
  MessageSquare,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  Square,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import { useModKey } from "@/lib/hooks/useModKey";
import CommandBarTrigger from "@/components/CommandBarTrigger";
import NotificationCenter from "@/components/NotificationCenter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SupportModal from "@/components/header/SupportModal";
import SystemStatusPills from "@/components/SystemStatusPills";
import UserProfileDropdownSkeleton from "@/components/UserProfileDropdownSkeleton";
import BrandMark from "@/components/BrandMark";
import Tooltip from "@/components/Tooltip";
import ThemePicker from "@/components/ThemePicker";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";
import { useDynamicIslandStore } from "@/lib/stores/dynamic-island";
import { THEME_DEFINITIONS, resolvePremiumTheme } from "@/lib/theme-engine";
import { cn } from "@/lib/utils";

const UserProfileDropdown = dynamic(() => import("@/components/UserProfileDropdown"), {
  ssr: false,
  loading: () => <UserProfileDropdownSkeleton />,
});

const ROUTE_LABELS: Record<string, string> = {
  "/": "Vue d'ensemble",
  "/notes": "Notes",
  "/tasks": "Tâches",
  "/calendar": "Calendrier",
  "/files": "Fichiers",
  "/settings": "Réglages",
  "/profile": "Profil",
  "/brain": "Brain",
  "/focus": "Focus",
  "/mail": "Mail",
  "/team": "Équipe",
  "/bills": "Factures",
  "/activity": "Activité",
  "/security": "Sécurité",
  "/discord": "Discord",
  "/marketplace": "Marketplace",
};

function useBreadcrumb() {
  const i18n = useI18n();
  const pathname = usePathname() ?? "/";
  const label = ROUTE_LABELS[pathname] || pathname.split("/").filter(Boolean)[0] || "ETHONE";
  return { home: "ETHONE", page: i18n(label) || label };
}

function SidebarTopToggle() {
  const { open, setOpen } = useAnimatedSidebar();
  const mod = useModKey();
  const kb = mod === "⌘" ? "⌘B" : "Ctrl B";
  return (
    <Tooltip label={open ? `Réduire la barre (${kb})` : `Ouvrir la barre (${kb})`} position="bottom">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
        aria-label="Basculer la barre latérale"
      >
        <Icon name={open ? "sidebar-simple" : "sidebar"} className="h-4 w-4" />
      </button>
    </Tooltip>
  );
}

function ThemeToggle() {
  const { settings, update } = useSettings();
  const resolved = resolvePremiumTheme(settings.theme);
  const themeLabel = THEME_DEFINITIONS[resolved]?.label ?? "Thème";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: string) {
    // Un thème suit son propre accent (« auto ») : plus de recopie ni de surcharge résiduelle.
    update({ theme: id, accentColor: "auto" });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <Tooltip label={`Thème : ${themeLabel}`} position="bottom">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-[var(--inset-radius)] border transition-all active:scale-95 cursor-pointer shadow-sm",
            open
              ? "border-[var(--accent-primary)]/50 bg-[var(--surface-hover)] text-[var(--text-primary)]"
              : "border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          )}
          aria-label="Changer de thème"
        >
          <Palette className="h-4 w-4" />
        </button>
      </Tooltip>

      {open && <ThemePicker activeId={resolved} activeLabel={themeLabel} onPick={pick} />}
    </div>
  );
}

function FocusLivePill({ mobile }: { mobile?: boolean } = {}) {
  const focus = useFocus();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { phase, remaining, total, paused, activePreset, goal } = focus.state;
  const isActive = phase !== "idle";

  if (!isActive) {
    if (mobile) return null;
    return (
      <Tooltip label="Démarrer Focus (F2)" position="bottom">
        <button
          type="button"
          onClick={() => focus.start("pomodoro")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
          aria-label="Mode Focus"
        >
          <Timer className="h-4 w-4" />
        </button>
      </Tooltip>
    );
  }

  const phaseLabel = phase === "focus" ? "Focus" : phase === "shortBreak" ? "Pause" : "Longue pause";
  const dotColor =
    phase === "focus"
      ? "bg-[var(--accent-primary)]"
      : phase === "shortBreak"
      ? "bg-emerald-400"
      : "bg-amber-400";
  const progressPercent =
    total > 0 ? Math.min(100, Math.round(((total - remaining) / total) * 100)) : 0;

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      trigger="click"
      side="bottom"
      align="end"
      sideOffset={8}
      panelRadius={18}
      gooStrength={0}
    >
      <PopoverTrigger>
        <button
          type="button"
          aria-label={`Mode Focus actif : ${phaseLabel} ${focus.format(remaining)}`}
          className="group relative flex h-9 items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 px-2.5 text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/25 transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            {!paused && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  dotColor
                )}
              />
            )}
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColor)} />
          </span>

          <span className="text-xs font-bold font-mono text-[var(--accent-primary)]">
            {focus.format(remaining)}
          </span>

          <span className="hidden xl:inline text-[11px] font-medium text-[var(--text-muted)]">
            {phaseLabel}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 overflow-hidden rounded-[18px] border border-[var(--panel-border)]/80 bg-[var(--bg-surface-elevated)] p-3.5 shadow-2xl backdrop-blur-2xl z-[var(--z-dropdown)]">
        <div className="flex flex-col gap-3 select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor)} />
              <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                {goal || (activePreset ? `Session · ${activePreset}` : phaseLabel)}
              </span>
            </div>
            <Link
              href="/focus"
              onClick={() => setPopoverOpen(false)}
              className="text-[10px] font-semibold text-[var(--accent-primary)] hover:underline shrink-0"
            >
              Plein écran →
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <span className="font-mono text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {focus.format(remaining)}
            </span>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Controls */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => (paused ? focus.resume() : focus.pause())}
              title={paused ? "Reprendre" : "Pause"}
              className="flex h-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
            >
              {paused ? (
                <Play className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Pause className="h-3.5 w-3.5 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={() => focus.adjustTime(300)}
              title="Ajouter 5 minutes"
              className="flex h-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] text-xs font-bold font-mono text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
            >
              +5m
            </button>

            {phase !== "focus" ? (
              <button
                type="button"
                onClick={() => focus.skipBreak()}
                title="Passer la pause"
                className="flex h-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => focus.adjustTime(-300)}
                title="Retirer 5 minutes"
                className="flex h-8 items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] text-xs font-bold font-mono text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
              >
                -5m
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                focus.stop();
              }}
              title="Arrêter la session"
              className="flex h-8 items-center justify-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-all cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DynamicIslandToggle() {
  const { visible, toggle } = useDynamicIslandStore();

  return (
    <Tooltip label={visible ? "Masquer la Dynamic Island" : "Afficher la Dynamic Island"} position="bottom">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-[var(--inset-radius)] border transition-all active:scale-95 cursor-pointer shadow-sm",
          visible
            ? "border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            : "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]"
        )}
        aria-label="Dynamic Island"
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </Tooltip>
  );
}

function FeedbackButton() {
  return (
    <Tooltip label="Assistant Brain & Échange" position="bottom">
      <Link
        href="/brain"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
        aria-label="Assistant Brain"
      >
        <MessageSquare className="h-4 w-4" />
      </Link>
    </Tooltip>
  );
}

function TopBar() {
  const { home, page } = useBreadcrumb();

  return (
    <header
      data-v8-topbar
      className="pointer-events-none relative z-40 shrink-0 select-none border-b border-[var(--panel-border)]/60 bg-[var(--panel-bg)]/80 px-4 pt-safe backdrop-blur-[var(--panel-blur)] transition-all"
    >
      {/* Mobile Bar */}
      <div className="pointer-events-auto flex h-14 items-center justify-between md:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark size={24} className="shrink-0" />
          <span className="truncate text-xs font-bold text-[var(--text-primary)]">
            {page}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <FocusLivePill mobile />
          <CommandBarTrigger />
          <NotificationCenter />
          <UserProfileDropdown dataTestId="user-profile-trigger-mobile" />
        </div>
      </div>

      {/* Desktop Bar */}
      <div className="relative pointer-events-auto hidden h-14 w-full items-center justify-between gap-3 md:flex">
        {/* Left: Sidebar toggle + Breadcrumb */}
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <SidebarTopToggle />
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] max-w-[140px] sm:max-w-[200px] lg:max-w-[280px]">
            <Link
              href="/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            >
              {home}
            </Link>
            <ChevronRight className="h-3 w-3 text-[var(--text-muted)]/50 shrink-0" />
            <span className="font-bold text-[var(--text-primary)] truncate">
              {page}
            </span>
          </nav>
        </div>

        {/* Center: System status pills - only visible on wide viewports (2xl+) to never collide */}
        <div className="hidden 2xl:flex items-center justify-center shrink-0">
          <SystemStatusPills />
        </div>

        {/* Right: Quick Tools & Unified Controls */}
        <div className="flex items-center justify-end gap-1.5 shrink-0 ml-auto">
          {/* Quick Tool Icons */}
          <div className="flex items-center gap-1.5">
            <FocusLivePill />
            <div className="hidden 2xl:flex items-center gap-1.5">
              <FeedbackButton />
              <DynamicIslandToggle />
              <ThemeToggle />
            </div>
          </div>

          <div className="hidden xl:inline-flex">
            <SupportModal />
          </div>
          <CommandBarTrigger />
          <NotificationCenter />
          <div className="hidden lg:inline-flex">
            <LanguageSwitcher />
          </div>
          <UserProfileDropdown dataTestId="user-profile-trigger-desktop" />
        </div>
      </div>
    </header>
  );
}

export default memo(TopBar);
