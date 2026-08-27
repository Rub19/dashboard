"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { memo } from "react";
import {
  Palette,
  Timer,
  Eye,
  EyeOff,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
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
  return (
    <Tooltip label={open ? "Réduire la barre (⌘B)" : "Ouvrir la barre (⌘B)"} position="bottom">
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
  const currentIndex = PREMIUM_THEMES.indexOf(resolved);
  const next = PREMIUM_THEMES[(currentIndex + 1) % PREMIUM_THEMES.length];
  const themeLabel = THEME_DEFINITIONS[resolved]?.label ?? "Thème";

  return (
    <Tooltip label={`Thème : ${themeLabel}`} position="bottom">
      <button
        type="button"
        onClick={() => update({ theme: next })}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
        aria-label="Changer de thème"
      >
        <Palette className="h-4 w-4" />
      </button>
    </Tooltip>
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
      <div className="relative pointer-events-none hidden h-14 w-full items-center justify-between md:flex">
        {/* Left: Sidebar toggle + Breadcrumb */}
        <div className="pointer-events-auto flex min-w-0 items-center gap-3 z-10">
          <SidebarTopToggle />
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
            <Link
              href="/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {home}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]/50" />
            <span className="font-bold text-[var(--text-primary)] truncate">
              {page}
            </span>
          </nav>
        </div>

        {/* Center: System status pills (Workspace, Sync, Weather, Clock) - Exactly aligned on 50% viewport center */}
        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-0">
          <SystemStatusPills />
        </div>

        {/* Right: Quick Tools & Unified Controls */}
        <div className="pointer-events-auto flex items-center justify-end gap-2 ml-auto z-10">
          {/* Quick Tool Icons */}
          <div className="hidden xl:flex items-center gap-1.5">
            <FeedbackButton />
            <FocusToggle />
            <DynamicIslandToggle />
            <ThemeToggle />
          </div>

          <SupportModal />
          <CommandBarTrigger />
          <NotificationCenter />
          <LanguageSwitcher />
          <UserProfileDropdown dataTestId="user-profile-trigger-desktop" />
        </div>
      </div>
    </header>
  );
}

export default memo(TopBar);
