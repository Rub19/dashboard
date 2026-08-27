"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { memo } from "react";
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import CommandBarTrigger from "@/components/CommandBarTrigger";
import NotificationCenter from "@/components/NotificationCenter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SupportModal from "@/components/header/SupportModal";
import HeaderContextPill from "@/components/header/HeaderContextPill";
import UserProfileDropdownSkeleton from "@/components/UserProfileDropdownSkeleton";
import BrandMark from "@/components/BrandMark";
import Tooltip from "@/components/Tooltip";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";

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
  "/focus": "Focus OS",
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
          <HeaderContextPill />
          <CommandBarTrigger />
          <NotificationCenter />
          <UserProfileDropdown dataTestId="user-profile-trigger-mobile" />
        </div>
      </div>

      {/* Desktop Bar */}
      <div className="pointer-events-none hidden h-14 grid-cols-[auto_1fr_auto] items-center gap-x-4 md:grid">
        {/* Left: Sidebar toggle + Breadcrumb */}
        <div className="pointer-events-auto col-start-1 flex min-w-0 items-center gap-3">
          <SidebarTopToggle />
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
            <Link
              href="/"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {home}
            </Link>
            <Icon name="caret-right" className="h-3 w-3 text-[var(--text-muted)]/50" />
            <span className="font-bold text-[var(--text-primary)] truncate">
              {page}
            </span>
          </nav>
        </div>

        {/* Center: Contextual activity pill */}
        <div className="pointer-events-auto col-start-2 flex items-center justify-center">
          <HeaderContextPill />
        </div>

        {/* Right: Unified Controls */}
        <div className="pointer-events-auto col-start-3 flex items-center justify-end gap-2">
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
