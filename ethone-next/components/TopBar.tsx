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
  Check,
} from "lucide-react";
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
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";
import { useDynamicIslandStore } from "@/lib/stores/dynamic-island";
import { PREMIUM_THEMES, THEME_DEFINITIONS, resolvePremiumTheme } from "@/lib/theme-engine";
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
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
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
    // Applying a theme must also reset the accent to that theme's own design,
    // or a separately-stored accentColor keeps overriding it.
    update({
      theme: id,
      accentColor: "custom",
      customAccent: THEME_DEFINITIONS[id as keyof typeof THEME_DEFINITIONS]?.accentPrimary || settings.customAccent,
    });
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
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer shadow-sm",
            open
              ? "border-[var(--accent-primary)]/50 bg-[var(--surface-hover)] text-[var(--text-primary)]"
              : "border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          )}
          aria-label="Changer de thème"
        >
          <Palette className="h-4 w-4" />
        </button>
      </Tooltip>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-56 overflow-y-auto os-scroll rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1.5 shadow-2xl backdrop-blur-2xl"
        >
          {PREMIUM_THEMES.map((id) => {
            const def = THEME_DEFINITIONS[id];
            const active = id === resolved;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => pick(id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-[var(--accent-muted)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                )}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-white/15"
                  style={{ background: `linear-gradient(135deg, ${def?.accentPrimary ?? "#888"}, ${def?.accentSecondary ?? def?.accentPrimary ?? "#888"})` }}
                />
                <span className="min-w-0 flex-1 truncate">{def?.label ?? id}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FocusToggle() {
  const focus = useFocus();
  const isActive = focus.state.phase !== "idle";

  return (
    <Tooltip label={isActive ? "Arrêter Focus (F2)" : "Démarrer Focus (F2)"} position="bottom">
      <button
        type="button"
        onClick={() => (isActive ? focus.stop() : focus.start("pomodoro"))}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer shadow-sm",
          isActive
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] shadow-sm shadow-[var(--accent-primary)]/20"
            : "border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        )}
        aria-label="Mode Focus"
      >
        <Timer className="h-4 w-4" />
      </button>
    </Tooltip>
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
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer shadow-sm",
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
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
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
      className="pointer-events-none relative z-40 shrink-0 select-none border-b border-[var(--panel-border)]/60 bg-[var(--panel-bg)]/80 px-4 pt-safe backdrop-blur-2xl transition-all"
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
          <div className="hidden 2xl:flex items-center gap-1.5">
            <FeedbackButton />
            <FocusToggle />
            <DynamicIslandToggle />
            <ThemeToggle />
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
