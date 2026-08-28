"use client";

import Link from "next/link";
import ClientImage from "@/components/ClientImage";
import { cloneElement, memo, useMemo, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  CheckCircle2,
  CalendarDays,
  Folder,
  Mail,
  Brain,
  Timer,
  CloudSun,
  Activity,
  Plug,
  Boxes,
  BarChart3,
  Settings,
  PanelLeftClose,
  Loader2,
  AlertCircle,
  WifiOff,
  LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { useAuth } from "@/components/AuthProvider";
import { ADMIN_EMAIL } from "@/lib/admin";
import { useSyncStore } from "@/lib/stores/sync";
import { cn } from "@/lib/utils";
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

type AppItem = {
  id: string;
  href: string;
  icon: LucideIcon;
};

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
  { id: "home", href: "/", icon: Home },
  { id: "notes", href: "/notes/", icon: BookOpen },
  { id: "tasks", href: "/tasks/", icon: CheckCircle2 },
  { id: "calendar", href: "/calendar/", icon: CalendarDays },
  { id: "files", href: "/files/", icon: Folder },
  { id: "mail", href: "/mail/", icon: Mail },
  { id: "brain", href: "/brain/", icon: Brain },
  { id: "focus", href: "/focus/", icon: Timer },
  { id: "weather", href: "/weather/", icon: CloudSun },
  { id: "activity", href: "/activity/", icon: Activity },
  { id: "connections", href: "/connections/", icon: Plug },
  { id: "plugins", href: "/plugins/", icon: Boxes },
  { id: "admin", href: "/admin/", icon: BarChart3 },
  { id: "settings", href: "/settings/", icon: Settings },
];

import { motion } from "framer-motion";

const SidebarBrand = memo(function SidebarBrand() {
  const { collapsed } = useAnimatedSidebarPanel();
  return (
    <Link
      href="/"
      className={cn(
        "flex h-10 items-center gap-2.5 text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] transition-transform active:scale-95",
        collapsed && "justify-center"
      )}
      aria-label="ETHONE"
    >
      <BrandMark size={32} className="shrink-0 drop-shadow-md" />
      <motion.span
        initial={false}
        animate={{
          opacity: collapsed ? 0 : 1,
          x: collapsed ? -6 : 0,
        }}
        transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
        className={cn(
          "text-sm font-bold tracking-tight whitespace-nowrap",
          collapsed && "hidden"
        )}
      >
        ETHONE
      </motion.span>
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
      icon: <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />,
      label: i18n("syncing", "Sync"),
      dot: "bg-[var(--accent-primary)]",
    },
    error: {
      icon: <AlertCircle className="h-4 w-4 text-[var(--danger)]" />,
      label: i18n("error", "Erreur"),
      dot: "bg-[var(--danger)]",
    },
    offline: {
      icon: <WifiOff className="h-4 w-4 text-[var(--warning)]" />,
      label: i18n("offline", "Hors ligne"),
      dot: "bg-[var(--warning)]",
    },
    idle: {
      icon: <CheckCircle2 className="h-4 w-4 text-[var(--accent-primary)]" />,
      label: i18n("synced", "Sync"),
      dot: "bg-[var(--accent-primary)]",
    },
  };
  const statusConfig = config[status];

  const tooltip = activeSources
    ? `${statusConfig.label} — ${activeSources}`
    : statusConfig.label;

  const icon = cloneElement(statusConfig.icon, {
    className: cn(statusConfig.icon.props.className, collapsed ? "h-4 w-4" : "h-3.5 w-3.5"),
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
  const router = useRouter();
  const { displayName, avatarUrl, initials } = useUserIdentity();

  return (
    <button
      type="button"
      onClick={() => router.push("/settings?category=profile")}
      className={cn(
        "group mb-2 flex w-full items-center gap-2.5 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 transition-all hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] cursor-pointer",
        collapsed ? "justify-center p-1.5" : "p-2"
      )}
      title={`Profil : ${displayName}`}
      aria-label={`Profil : ${displayName}`}
    >
      <div className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--text-primary)]/[0.08] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold text-xs",
        collapsed ? "h-9 w-9" : "h-8 w-8"
      )}>
        {avatarUrl ? (
          <ClientImage
            src={avatarUrl}
            alt={displayName}
            width={36}
            height={36}
            className="h-full w-full object-cover rounded-xl"
            fallback={
              <span className="font-bold text-xs">{initials}</span>
            }
          />
        ) : (
          <span className="font-bold text-xs">{initials}</span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)] bg-emerald-400" aria-hidden="true" />
      </div>
      <motion.span
        initial={false}
        animate={{
          opacity: collapsed ? 0 : 1,
          x: collapsed ? -6 : 0,
        }}
        transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
        className={cn(
          "min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors text-left whitespace-nowrap",
          collapsed && "hidden"
        )}
      >
        {displayName}
      </motion.span>
    </button>
  );
});

const SidebarFooter = memo(function SidebarFooter() {
  const i18n = useI18n();
  const router = useRouter();
  const { setOpen } = useAnimatedSidebar();
  const { collapsed } = useAnimatedSidebarPanel();

  return (
    <div className="flex flex-col gap-3">
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-transparent bg-transparent text-[var(--text-muted)] transition-colors hover:border-[var(--panel-border)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] cursor-pointer"
          aria-label={i18n("settings")}
          title={i18n("settings")}
        >
          <Settings className="h-4.5 w-4.5" strokeWidth={1.85} />
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-transparent bg-transparent text-[var(--text-muted)] transition-colors hover:border-[var(--panel-border)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] cursor-pointer"
          aria-label={i18n("collapseSidebar", "Réduire")}
          title={i18n("collapseSidebar", "Réduire")}
        >
          <PanelLeftClose className="h-4.5 w-4.5" strokeWidth={1.85} />
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

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerEnter = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setOpen(true);
    }, 120);
  }, [setOpen]);

  const handlePointerLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 180);
  }, [setOpen]);

  return (
    <div
      className="relative z-[var(--z-sidebar)] hidden h-full min-h-0 w-auto shrink-0 pointer-events-auto md:block will-change-transform"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <AnimatedSidebar
        collapsible="icon"
        variant="sidebar"
        ariaLabel="Navigation principale"
        className="h-full bg-transparent"
        panelClassName="h-full shrink-0 rounded-r-[var(--panel-radius)] border-r border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 pb-8 backdrop-blur-[var(--panel-blur)] pt-[calc(0.75rem+env(safe-area-inset-top))]"
      >
        <AnimatedSidebarHeader>
          <SidebarBrand />
        </AnimatedSidebarHeader>
        <AnimatedSidebarContent>
          <AnimatedSidebarMenu>
            {visibleApps.map((app) => {
              const IconComponent = app.icon;
              return (
                <AnimatedSidebarMenuItem key={app.id} onMouseEnter={() => router.prefetch(app.href)}>
                  <AnimatedSidebarMenuButton
                    isActive={isActive(app)}
                    icon={
                      <IconComponent
                        className="h-[21px] w-[21px] transition-transform duration-200 group-hover:scale-110"
                        strokeWidth={1.9}
                      />
                    }
                    shortcut={SHORTCUTS[app.id]}
                    onSelect={() => router.push(app.href)}
                  >
                    {i18n(app.id, app.id === "admin" ? "Admin" : app.id)}
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              );
            })}
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
