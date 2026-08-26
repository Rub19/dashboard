"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AnimatedSidebarTrigger, useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import CommandBarTrigger from "@/components/CommandBarTrigger";
import NotificationCenter from "@/components/NotificationCenter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import UserProfileDropdownSkeleton from "@/components/UserProfileDropdownSkeleton";
import BrandMark from "@/components/BrandMark";
import Tooltip from "@/components/Tooltip";
import IconButton from "@/components/ui/IconButton";

const UserProfileDropdown = dynamic(() => import("@/components/UserProfileDropdown"), {
  ssr: false,
  loading: () => <UserProfileDropdownSkeleton />,
});
import { memo } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";
import { useDynamicIslandStore } from "@/lib/stores/dynamic-island";
import SupportButton from "@/components/dashboard/SupportButton";
import SystemStatusPills from "@/components/SystemStatusPills";
import { Icon } from "@/lib/icons";
import { PREMIUM_THEMES, THEME_DEFINITIONS, resolvePremiumTheme } from "@/lib/theme-engine";

const ROUTE_LABELS: Record<string, string> = {
  "/": "home",
  "/notes": "notes",
  "/tasks": "tasks",
  "/calendar": "calendar",
  "/files": "files",
  "/settings": "settings",
  "/profile": "profile",
  "/brain": "brain",
  "/focus": "focus",
  "/mail": "mail",
  "/team": "team",
  "/bills": "bills",
  "/activity": "activity",
  "/security": "security",
};

function useBreadcrumb() {
  const i18n = useI18n();
  const pathname = usePathname() ?? "/";
  const pageKey = ROUTE_LABELS[pathname] || pathname.split("/").filter(Boolean)[0] || "home";
  return { home: "ETHONE", page: i18n(pageKey) || pageKey };
}

const SidebarTopToggle = memo(function SidebarTopToggle() {
  const { open } = useAnimatedSidebar();
  return (
    <Tooltip label={open ? "Réduire — ⌘B" : "Ouvrir — ⌘B"} position="bottom">
      <AnimatedSidebarTrigger
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] shadow-lg backdrop-blur-md transition-[color,background-color,border-color,opacity,transform] duration-150 ease-out hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
        aria-label="Basculer la barre latérale"
      >
        <Icon pack="lucide" name={open ? "panel-left-close" : "panel-left-open"} className="h-4 w-4" />
      </AnimatedSidebarTrigger>
    </Tooltip>
  );
});

const ThemeToggle = memo(function ThemeToggle() {
  const { settings, update } = useSettings();
  const resolved = resolvePremiumTheme(settings.theme);
  const currentIndex = PREMIUM_THEMES.indexOf(resolved);
  const next = PREMIUM_THEMES[(currentIndex + 1) % PREMIUM_THEMES.length];
  const themeLabel = THEME_DEFINITIONS[resolved]?.label ?? "Thème";

  return (
    <Tooltip label={`Thème — ${themeLabel} (clic)`} position="bottom">
      <IconButton
        size="lg"
        variant="ghost"
        onClick={() => update({ theme: next })}
        aria-label="Thème"
      >
        <Icon pack="phosphor" name="palette" className="h-5 w-5" />
      </IconButton>
    </Tooltip>
  );
});

const FocusToggle = memo(function FocusToggle() {
  const focus = useFocus();
  const isActive = focus.state.phase !== "idle";

  return (
    <Tooltip label="Focus — F2" position="bottom">
      <IconButton
        size="lg"
        variant={isActive ? "active" : "ghost"}
        onClick={() => (isActive ? focus.stop() : focus.start("pomodoro"))}
        aria-label={isActive ? "Arrêter le minuteur" : "Démarrer le minuteur"}
      >
        <Icon pack="phosphor" name="timer" className="h-5 w-5" />
      </IconButton>
    </Tooltip>
  );
});

const DynamicIslandToggle = memo(function DynamicIslandToggle() {
  const { visible, toggle } = useDynamicIslandStore();

  return (
    <Tooltip label="Dynamic Island" position="bottom">
      <IconButton
        size="lg"
        variant="ghost"
        onClick={toggle}
        aria-label={visible ? "Masquer la Dynamic Island" : "Afficher la Dynamic Island"}
      >
        <Icon pack="lucide" name={visible ? "eye" : "eye-off"} className="h-5 w-5" />
      </IconButton>
    </Tooltip>
  );
});

function TopBar() {
  const { home, page } = useBreadcrumb();

  return (
    <header
      data-v8-topbar
      className="pointer-events-none relative z-40 shrink-0 select-none border-0 border-b border-[var(--text-primary)]/[0.05] bg-[var(--panel-bg)] px-4 pt-safe backdrop-blur-[var(--panel-blur)]"
    >
      {/* Mobile: compact header with logo, page title, search, notifications, profile */}
      <div className="pointer-events-auto flex h-14 items-center justify-between md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark size={26} className="shrink-0" />
          <span className="max-w-[26ch] truncate text-sm font-semibold text-[var(--text-primary)] capitalize">
            {page}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip label="Rechercher — ⌘K" position="bottom">
            <CommandBarTrigger />
          </Tooltip>
          <NotificationCenter />
          <UserProfileDropdown dataTestId="user-profile-trigger-mobile" />
        </div>
      </div>

      {/* Desktop: full grid with breadcrumb, system status, quick tools */}
      <div className="pointer-events-none hidden h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 md:grid">
        {/* Left — Identity & Breadcrumb */}
        <div className="pointer-events-auto col-start-1 flex min-w-0 items-center gap-2 justify-self-start sm:gap-3">
          <SidebarTopToggle />
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 sm:gap-2 text-sm font-medium text-[var(--text-muted)]">
            <Link href="/" className="shrink-0 transition-colors hover:text-[var(--text-primary)]">
              {home}
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]/60" />
            <span className="max-w-[12ch] truncate font-semibold text-[var(--text-primary)] capitalize sm:max-w-[18ch] lg:max-w-[24ch]">
              {page}
            </span>
          </nav>
        </div>

        {/* Center — system status pills */}
        <div className="pointer-events-auto col-start-2 hidden items-center justify-center justify-self-center lg:flex">
          <SystemStatusPills />
        </div>

        {/* Right — Quick tools, palette, profile */}
        <div className="col-start-3 flex min-w-0 items-center justify-end gap-2.5 sm:gap-4 justify-self-end pointer-events-auto">
          <div className="hidden items-center gap-2 sm:gap-3 md:flex pointer-events-auto">
            <ThemeToggle />
            <FocusToggle />
            <DynamicIslandToggle />
            <SupportButton />
          </div>

          <Tooltip label="Rechercher — ⌘K" position="bottom">
            <CommandBarTrigger />
          </Tooltip>

          <NotificationCenter />

          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <UserProfileDropdown dataTestId="user-profile-trigger-desktop" />
        </div>
      </div>
    </header>
  );
}

export default memo(TopBar);
