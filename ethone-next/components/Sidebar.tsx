"use client";

import Link from "next/link";
import Image from "next/image";
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
import { useActiveProfile } from "@/components/SettingsProvider";
import { useSyncStore } from "@/lib/stores/sync";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
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

const APPS: AppItem[] = [
  { id: "home", href: "/", icon: "home" },
  { id: "notes", href: "/notes/", icon: "notes" },
  { id: "tasks", href: "/tasks/", icon: "tasks" },
  { id: "calendar", href: "/calendar/", icon: "calendar" },
  { id: "files", href: "/files/", icon: "files" },
  { id: "mail", href: "/mail/", icon: "mail" },
  { id: "brain", href: "/brain/", icon: "brain" },
  { id: "focus", href: "/focus/", icon: "focus" },
  { id: "activity", href: "/activity/", icon: "activity" },
  { id: "settings", href: "/settings/", icon: "settings" },
  { id: "connections", href: "/connections/", icon: "connections" },
  { id: "plugins", href: "/plugins/", icon: "plugins" },
];

function SidebarBrand() {
  return (
    <Link
      href="/"
      className="flex h-9 items-center gap-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="ETHONE"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[10px] font-bold">
        E
      </div>
      <span className="text-sm font-bold tracking-tight">ETHONE</span>
    </Link>
  );
}

function SyncBadge({ collapsed }: { collapsed: boolean }) {
  const i18n = useI18n();
  const status = useSyncStore((s) => s.status);

  const config = {
    syncing: {
      icon: <Loader2 className="h-3 w-3 animate-spin text-purple-400" />,
      label: i18n("syncing", "Sync"),
      dot: "bg-purple-400",
    },
    error: {
      icon: <AlertCircle className="h-3 w-3 text-red-400" />,
      label: i18n("error", "Erreur"),
      dot: "bg-red-400",
    },
    offline: {
      icon: <WifiOff className="h-3 w-3 text-amber-400" />,
      label: i18n("offline", "Hors ligne"),
      dot: "bg-amber-400",
    },
    idle: {
      icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
      label: i18n("synced", "Sync"),
      dot: "bg-emerald-400",
    },
  }[status];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-[10px] font-medium text-zinc-400",
        collapsed && "justify-center px-2"
      )}
      title={config.label}
    >
      {config.icon}
      {!collapsed && <span className="truncate">{config.label}</span>}
    </div>
  );
}

function SidebarProfile({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();

  const displayName =
    publicProfile?.display_name || activeProfile?.name || user?.email || "Invité";
  const avatarUrl = publicProfile?.avatar_url;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2",
        collapsed && "justify-center"
      )}
    >
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
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
          <User className="h-4 w-4 text-zinc-400" />
        )}
      </div>
      {!collapsed && (
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-200">
          {displayName}
        </span>
      )}
    </div>
  );
}

function SidebarFooter() {
  const i18n = useI18n();
  const router = useRouter();
  const { setOpen } = useAnimatedSidebar();
  const { collapsed } = useAnimatedSidebarPanel();

  return (
    <div className="flex flex-col gap-2">
      <SidebarProfile collapsed={collapsed} />

      <div className="flex items-center gap-2">
        <SyncBadge collapsed={collapsed} />

        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition-colors hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
          aria-label={i18n("settings")}
          title={i18n("settings")}
        >
          <Settings className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition-colors hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
          aria-label={i18n("collapseSidebar", "Réduire")}
          title={i18n("collapseSidebar", "Réduire")}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const i18n = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { setOpen } = useAnimatedSidebar();

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
      className="relative h-auto min-h-svh w-auto shrink-0"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      <AnimatedSidebar
        collapsible="icon"
        variant="floating"
        ariaLabel="Navigation principale"
        panelClassName="m-0 h-full shrink-0 rounded-2xl border border-white/[0.08] bg-zinc-950/75 p-3 backdrop-blur-2xl"
      >
        <AnimatedSidebarHeader>
          <SidebarBrand />
        </AnimatedSidebarHeader>
        <AnimatedSidebarContent>
          <AnimatedSidebarMenu>
            {APPS.map((app) => (
              <AnimatedSidebarMenuItem key={app.id}>
                <AnimatedSidebarMenuButton
                  isActive={isActive(app)}
                  icon={<Icon name={app.icon} className="h-5 w-5" />}
                  onSelect={() => router.push(app.href)}
                >
                  {i18n(app.id)}
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            ))}
          </AnimatedSidebarMenu>
        </AnimatedSidebarContent>
        <AnimatedSidebarFooter>
          <SidebarFooter />
        </AnimatedSidebarFooter>
        <AnimatedSidebarRail />
      </AnimatedSidebar>
    </div>
  );
}
