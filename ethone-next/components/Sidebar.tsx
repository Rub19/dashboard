"use client";

import Link from "next/link";
import Image from "next/image";
import { cloneElement, memo, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeftClose,
  Settings,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  WifiOff,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useProfile } from "@/lib/hooks/useProfile";
import { useAuth } from "@/components/AuthProvider";
import { ADMIN_EMAIL } from "@/lib/admin";
import { useActiveProfile } from "@/components/SettingsProvider";
import { useSyncStore } from "@/lib/stores/sync";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import BrandMark from "@/components/BrandMark";
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarRail,
  useAnimatedSidebar,
  useAnimatedSidebarPanel,
} from "@/components/motion/animated-sidebar";

type AppItem = { id: string; href: string; icon: string };

const SHORTCUTS: Record<string, string> = {
  home: "⌘1",
  notes: "⌘2",
  tasks: "⌘3",
  calendar: "⌘4",
  files: "⌘5",
  mail: "⌘6",
  brain: "⌘7",
  focus: "⌘8",
  weather: "⌘9",
};

const APPS: AppItem[] = [
  { id: "home", href: "/", icon: "home" },
  { id: "notes", href: "/notes/", icon: "notes" },
  { id: "tasks", href: "/tasks/", icon: "tasks" },
  { id: "calendar", href: "/calendar/", icon: "calendar" },
  { id: "files", href: "/files/", icon: "files" },
  { id: "mail", href: "/mail/", icon: "mail" },
  { id: "brain", href: "/brain/", icon: "brain" },
  { id: "focus", href: "/focus/", icon: "focus" },
  { id: "weather", href: "/weather/", icon: "cloudSun" },
  { id: "activity", href: "/activity/", icon: "activity" },
  { id: "connections", href: "/connections/", icon: "connections" },
  { id: "plugins", href: "/plugins/", icon: "plugins" },
  { id: "admin", href: "/admin/", icon: "bar-chart" },
  { id: "settings", href: "/settings/", icon: "settings" },
];

const SidebarBrand = memo(function SidebarBrand() {
  const { collapsed } = useAnimatedSidebarPanel();
  return (
    <Link
      href="/"
      className={cn(
        "flex h-9 items-center gap-2 text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
        collapsed && "justify-center"
      )}
      aria-label="ETHONE"
    >
      <BrandMark size={28} className="shrink-0" />
      {!collapsed && <span className="text-sm font-bold tracking-tight">ETHONE</span>}
    </Link>
  );
});

const SyncBadge = memo(function SyncBadge({ collapsed }: { collapsed: boolean }) {
  const i18n = useI18n();
  const status = useSyncStore((s) => s.status);
  const activeSources = useSyncStore((s) =>
    Object.entries(s.sources)
      .filter(([, s]) => s !== "idle")
      .map(([k]) => k)
      .join(", ")
  );

  const config: Record<string, { icon: React.ReactElement<{ className?: string }>; label: string; dot: string }> = {
    syncing: {
      icon: <Loader2 className="h-3 w-3 animate-spin text-[var(--accent-primary)]" />,
      label: i18n("syncing", "Sync"),
      dot: "bg-[var(--accent-primary)]",
    },
    error: {
      icon: <AlertCircle className="h-3 w-3 text-[var(--danger)]" />,
      label: i18n("error", "Erreur"),
      dot: "bg-[var(--danger)]",
    },
    offline: {
      icon: <WifiOff className="h-3 w-3 text-[var(--warning)]" />,
      label: i18n("offline", "Hors ligne"),
      dot: "bg-[var(--warning)]",
    },
    idle: {
      icon: <CheckCircle2 className="h-3 w-3 text-[var(--accent-primary)]" />,
      label: i18n("synced", "Sync"),
      dot: "bg-[var(--accent-primary)]",
    },
  };
  const statusConfig = config[status];

  const tooltip = activeSources
    ? `${statusConfig.label} — ${activeSources}`
    : statusConfig.label;

  const icon = cloneElement(statusConfig.icon, {
    className: cn(statusConfig.icon.props.className, collapsed ? "h-4 w-4" : "h-3 w-3"),
  });

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border-transparent bg-transparent text-[10px] font-medium text-[var(--text-muted)]",
        collapsed
          ? "h-9 w-9 shrink-0 items-center justify-center p-0"
          : "px-2.5 py-2"
      )}
      title={tooltip}
    >
      {icon}
      {!collapsed && <span className="truncate">{statusConfig.label}</span>}
    </div>
  );
});

const SidebarProfile = memo(function SidebarProfile({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();

  const displayName =
    publicProfile?.display_name || activeProfile?.name || user?.email || "Invité";
  const avatarUrl = publicProfile?.avatar_url;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border-transparent bg-transparent",
        collapsed ? "justify-center p-0" : "p-2"
      )}
    >
      <div className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-transparent bg-transparent",
        collapsed ? "h-9 w-9" : "h-8 w-8"
      )}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={32}
            height={32}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <User className={cn("text-[var(--text-muted)]", collapsed ? "h-3.5 w-3.5" : "h-4 w-4")} />
        )}
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)] bg-[var(--accent-primary)]" aria-hidden="true" />
      </div>
      {!collapsed && (
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--text-primary)]">
          {displayName}
        </span>
      )}
    </div>
  );
});

const SidebarFooter = memo(function SidebarFooter() {
  const i18n = useI18n();
  const router = useRouter();
  const { setOpen } = useAnimatedSidebar();
  const { collapsed } = useAnimatedSidebarPanel();

  return (
    <div className="flex flex-col gap-2">
      <SidebarProfile collapsed={collapsed} />

      <div
        className={cn(
          "flex gap-2",
          collapsed ? "flex-col items-center justify-center" : "flex-row items-center"
        )}
      >
        <SyncBadge collapsed={collapsed} />

        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-transparent bg-transparent text-[var(--muted)] transition-colors hover:border-[var(--panel-border)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
          aria-label={i18n("settings")}
          title={i18n("settings")}
        >
          <Settings className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-transparent bg-transparent text-[var(--muted)] transition-colors hover:border-[var(--panel-border)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
          aria-label={i18n("collapseSidebar", "Réduire")}
          title={i18n("collapseSidebar", "Réduire")}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

function Sidebar() {
  const i18n = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { setOpen } = useAnimatedSidebar();
  const { user } = useAuth();
  const isAdmin = useMemo(() => user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(), [user?.email]);
  const visibleApps = useMemo(() => APPS.filter((app) => app.id !== "admin" || isAdmin), [isAdmin]);

  function isActive(app: AppItem) {
    if (app.href === "/") return pathname === "/";
    const base = app.href.replace(/\/$/, "");
    return (
      pathname === app.href ||
      pathname.startsWith(base + "/") ||
      pathname === base
    );
  }

  return (
    <div
      className="relative z-30 hidden h-full min-h-0 w-auto shrink-0 pointer-events-auto md:block"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      <AnimatedSidebar
        collapsible="icon"
        variant="floating"
        ariaLabel="Navigation principale"
        className="h-full bg-transparent pointer-events-auto"
        panelClassName="m-2 h-[calc(100%-1rem)] shrink-0 rounded-2xl p-3 backdrop-blur-[var(--panel-blur)] pointer-events-auto"
      >
        <AnimatedSidebarHeader>
          <SidebarBrand />
        </AnimatedSidebarHeader>
        <AnimatedSidebarContent>
          <AnimatedSidebarMenu>
            {visibleApps.map((app) => (
              <AnimatedSidebarMenuItem key={app.id}>
                <AnimatedSidebarMenuButton
                  isActive={isActive(app)}
                  icon={<Icon name={app.icon} className="h-5 w-5" />}
                  shortcut={SHORTCUTS[app.id]}
                  onSelect={() => router.push(app.href)}
                >
                  {i18n(app.id, app.id === "admin" ? "Admin" : app.id)}
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            ))}
          </AnimatedSidebarMenu>
        </AnimatedSidebarContent>
        <AnimatedSidebarFooter className="mb-3 border-t border-[var(--panel-border)] pt-3">
          <SidebarFooter />
        </AnimatedSidebarFooter>
        <AnimatedSidebarRail />
      </AnimatedSidebar>
    </div>
  );
}

export default memo(Sidebar);
