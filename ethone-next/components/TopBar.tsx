"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, CloudSun, Sun, Moon, Timer } from "lucide-react";
import SystemStatusPills from "@/components/SystemStatusPills";
import CommandBarTrigger from "@/components/CommandBarTrigger";
import NotificationCenter from "@/components/NotificationCenter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";

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

function WeatherQuickButton() {
  const router = useRouter();
  const { weather } = useLiveData(300000);
  const temp = typeof weather?.temperature === "number" ? `${weather.temperature}°C` : "--";

  return (
    <button
      type="button"
      onClick={() => router.push("/weather")}
      className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs transition-colors hover:bg-white/[0.06]"
      title="Météo"
    >
      <CloudSun className="h-3.5 w-3.5 text-amber-400" />
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
      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
      aria-label="Thème"
    >
      <Icon className="h-4 w-4" />
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
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        isActive
          ? "bg-emerald-500/15 text-emerald-400"
          : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
      }`}
      aria-label={isActive ? "Arrêter le minuteur" : "Démarrer le minuteur"}
    >
      <Timer className="h-4 w-4" />
    </button>
  );
}

export default function TopBar() {
  const { home, page } = useBreadcrumb();

  return (
    <header
      data-v8-topbar
      className="sticky top-0 z-50 flex h-12 w-full select-none items-center justify-between border-b border-white/[0.08] bg-zinc-950/80 px-4 backdrop-blur-2xl"
    >
      {/* Left — Identity & Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-xs font-bold text-white shadow-inner transition-colors hover:bg-white/[0.08]"
          aria-label={home}
        >
          E
        </Link>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <Link href="/" className="transition-colors hover:text-white">
            {home}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="font-semibold text-white capitalize">{page}</span>
        </nav>
      </div>

      {/* Center — System status */}
      <div className="hidden flex-1 justify-center lg:flex">
        <SystemStatusPills />
      </div>

      {/* Right — Quick tools, palette, profile */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <div className="hidden items-center gap-1.5 sm:flex">
          <WeatherQuickButton />
          <ThemeToggle />
          <FocusToggle />
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
