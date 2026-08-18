"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, CloudSun, Sun, Moon, Timer, Eye, EyeOff, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { AnimatedSidebarTrigger, useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import SystemStatusPills from "@/components/SystemStatusPills";
import CommandBarTrigger from "@/components/CommandBarTrigger";
import NotificationCenter from "@/components/NotificationCenter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";
import { useDynamicIslandStore } from "@/lib/stores/dynamic-island";

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

function SidebarTopToggle() {
  const { open } = useAnimatedSidebar();
  return (
    <AnimatedSidebarTrigger
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 shadow-lg backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-95 cursor-pointer select-none"
      aria-label="Basculer la barre latérale"
      title={open ? "Réduire" : "Ouvrir"}
    >
      {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
    </AnimatedSidebarTrigger>
  );
}

function WeatherQuickButton() {
  const router = useRouter();
  const { weather } = useLiveData(300000);
  const temp = typeof weather?.temperature === "number" ? `${weather.temperature}°C` : "--";

  return (
    <button
      type="button"
      onClick={() => router.push("/weather")}
      className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
      title="Météo"
    >
      <CloudSun className="h-4 w-4 pointer-events-none text-amber-400" />
      <span className="font-mono text-zinc-200">{temp}</span>
    </button>
  );
}

function ThemeToggle() {
  const { settings, update } = useSettings();
  const isDark = settings.darkMode ?? true;
  const Icon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => update({ darkMode: !isDark })}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-all duration-150 hover:bg-white/[0.08] hover:text-white active:scale-95 cursor-pointer select-none"
      aria-label="Thème"
    >
      <Icon className="h-5 w-5 pointer-events-none" />
    </button>
  );
}

function FocusToggle() {
  const focus = useFocus();
  const isActive = focus.state.phase !== "idle";

  return (
    <button
      type="button"
      onClick={() => (isActive ? focus.stop() : focus.start("pomodoro"))}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer select-none ${
        isActive
          ? "bg-emerald-500/15 text-emerald-400"
          : "text-zinc-400 hover:bg-white/[0.08] hover:text-white active:scale-95"
      }`}
      aria-label={isActive ? "Arrêter le minuteur" : "Démarrer le minuteur"}
    >
      <Timer className="h-5 w-5 pointer-events-none" />
    </button>
  );
}

function DynamicIslandToggle() {
  const { visible, toggle } = useDynamicIslandStore();

  return (
    <button
      type="button"
      onClick={toggle}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer select-none ${
        visible
          ? "text-zinc-400 hover:bg-white/[0.08] hover:text-white active:scale-95"
          : "text-zinc-600 hover:bg-white/[0.08] hover:text-zinc-400 active:scale-95"
      }`}
      aria-label={visible ? "Masquer la Dynamic Island" : "Afficher la Dynamic Island"}
      title={visible ? "Masquer la Dynamic Island" : "Afficher la Dynamic Island"}
    >
      {visible ? <Eye className="h-5 w-5 pointer-events-none" /> : <EyeOff className="h-5 w-5 pointer-events-none" />}
    </button>
  );
}

export default function TopBar() {
  const { home, page } = useBreadcrumb();

  return (
    <header
      data-v8-topbar
      className="flex h-12 shrink-0 select-none items-center justify-between rounded-2xl border border-white/[0.08] bg-zinc-950/75 px-4 backdrop-blur-2xl"
    >
      {/* Left — Identity & Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarTopToggle />
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium text-zinc-400">
          <Link href="/" className="transition-colors hover:text-white">
            {home}
          </Link>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
          <span className="font-semibold text-white capitalize">{page}</span>
        </nav>
      </div>

      {/* Center — System status */}
      <div className="hidden flex-1 justify-center lg:flex">
        <SystemStatusPills />
      </div>

      {/* Right — Quick tools, palette, profile */}
      <div className="relative z-40 flex min-w-0 flex-1 items-center justify-end gap-3 pointer-events-auto">
        <div className="hidden items-center gap-2 sm:flex pointer-events-auto">
          <WeatherQuickButton />
          <ThemeToggle />
          <FocusToggle />
          <DynamicIslandToggle />
        </div>

        <CommandBarTrigger />

        <NotificationCenter />

        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>

        <UserProfileDropdown />
      </div>
    </header>
  );
}
