"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, CloudSun, Timer, Eye, EyeOff, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { AnimatedSidebarTrigger, useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import SystemStatusPills from "@/components/SystemStatusPills";
import CommandBarTrigger from "@/components/CommandBarTrigger";
import NotificationCenter from "@/components/NotificationCenter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import UserProfileDropdownSkeleton from "@/components/UserProfileDropdownSkeleton";
import BrandMark from "@/components/BrandMark";
import Tooltip from "@/components/Tooltip";

const UserProfileDropdown = dynamic(() => import("@/components/UserProfileDropdown"), {
  ssr: false,
  loading: () => <UserProfileDropdownSkeleton />,
});
import { memo, useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";
import { useDynamicIslandStore } from "@/lib/stores/dynamic-island";
import WeatherDetailPopover from "@/components/WeatherDetailPopover";
import SupportButton from "@/components/dashboard/SupportButton";
import { Icon } from "@/lib/icons";
import { PREMIUM_THEMES, THEME_DEFINITIONS, resolvePremiumTheme } from "@/lib/theme-engine";
import { cn } from "@/lib/utils";

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
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] shadow-lg backdrop-blur-md transition-[color,background-color,border-color,opacity,transform] hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] active:scale-95 cursor-pointer select-none"
        aria-label="Basculer la barre latérale"
      >
        {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </AnimatedSidebarTrigger>
    </Tooltip>
  );
});

const WeatherQuickButton = memo(function WeatherQuickButton() {
  const { weather } = useLiveData(300000);
  const temp = typeof weather?.temperature === "number" ? `${weather.temperature}°C` : "--";
  const [open, setOpen] = useState(false);
  const [buttonEl, setButtonEl] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={setButtonEl}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-tooltip="Météo"
        data-tooltip-position="bottom"
        className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] px-2 text-sm transition-colors hover:bg-[var(--text-primary)]/[0.06] sm:px-3"
      >
        <CloudSun className="h-4 w-4 pointer-events-none text-amber-400" />
        <span className="hidden font-mono text-[var(--text-primary)] lg:inline">{temp}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-[var(--text-muted)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <WeatherDetailPopover open={open} onClose={() => setOpen(false)} referenceRef={buttonEl} weather={weather} />
    </>
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
      <button
        type="button"
        onClick={() => update({ theme: next })}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] transition-[color,background-color,border-color,opacity,transform] duration-150 hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] active:scale-95 cursor-pointer select-none"
        aria-label="Thème"
      >
        <Icon name="palette" className="h-5 w-5 pointer-events-none" />
      </button>
    </Tooltip>
  );
});

const FocusToggle = memo(function FocusToggle() {
  const focus = useFocus();
  const isActive = focus.state.phase !== "idle";

  return (
    <Tooltip label="Focus — F2" position="bottom">
      <button
        type="button"
        onClick={() => (isActive ? focus.stop() : focus.start("pomodoro"))}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-[color,background-color,border-color,opacity,transform] duration-150 cursor-pointer select-none ${
          isActive
            ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
            : "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] active:scale-95"
        }`}
        aria-label={isActive ? "Arrêter le minuteur" : "Démarrer le minuteur"}
      >
        <Timer className="h-5 w-5 pointer-events-none" />
      </button>
    </Tooltip>
  );
});

const DynamicIslandToggle = memo(function DynamicIslandToggle() {
  const { visible, toggle } = useDynamicIslandStore();

  return (
    <Tooltip label="Dynamic Island" position="bottom">
      <button
        type="button"
        onClick={toggle}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-[color,background-color,border-color,opacity,transform] duration-150 cursor-pointer select-none ${
          visible
            ? "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] active:scale-95"
            : "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-muted)] active:scale-95"
        }`}
        aria-label={visible ? "Masquer la Dynamic Island" : "Afficher la Dynamic Island"}
      >
        {visible ? <Eye className="h-5 w-5 pointer-events-none" /> : <EyeOff className="h-5 w-5 pointer-events-none" />}
      </button>
    </Tooltip>
  );
});

function TopBar() {
  const { home, page } = useBreadcrumb();

  return (
    <header
      data-v8-topbar
      className="pointer-events-none relative z-40 shrink-0 select-none rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 pt-safe backdrop-blur-[var(--panel-blur)]"
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
          <UserProfileDropdown />
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

        {/* Center — System status */}
        <div className="col-start-2 hidden min-w-0 items-center justify-center justify-self-center lg:flex lg:-ml-8 pointer-events-auto">
          <SystemStatusPills />
        </div>

        {/* Right — Quick tools, palette, profile */}
        <div className="col-start-3 flex min-w-0 items-center justify-end gap-2 sm:gap-3 justify-self-end pointer-events-auto">
          <div className="hidden items-center gap-1.5 sm:gap-2 md:flex pointer-events-auto">
            <WeatherQuickButton />
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

          <UserProfileDropdown />
        </div>
      </div>
    </header>
  );
}

export default memo(TopBar);
