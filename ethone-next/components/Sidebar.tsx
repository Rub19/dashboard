"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
  useAnimatedSidebar,
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
  const { open } = useAnimatedSidebar();
  return (
    <Link
      href="/"
      className="flex h-9 items-center gap-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="ETHONE"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[10px] font-bold">
        E
      </div>
      <span
        className={cn(
          "text-sm font-bold tracking-tight",
          open ? "inline" : "hidden",
        )}
      >
        ETHONE
      </span>
    </Link>
  );
}

function SidebarToggle() {
  const { open } = useAnimatedSidebar();
  return (
    <AnimatedSidebarTrigger
      type="button"
      className="h-9 w-full justify-start gap-2.5 rounded-lg px-3 text-zinc-400 hover:bg-white/[0.05] hover:text-white"
      aria-label="Basculer la sidebar"
    >
      <Icon name={open ? "chevron-left" : "chevron-right"} className="h-4 w-4" />
      <span className={cn("text-sm", open ? "inline" : "hidden")}>
        Réduire
      </span>
    </AnimatedSidebarTrigger>
  );
}

export default function Sidebar() {
  const i18n = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "/";

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
    <AnimatedSidebar
      collapsible="icon"
      variant="sidebar"
      ariaLabel="Navigation principale"
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
        <SidebarToggle />
      </AnimatedSidebarFooter>
      <AnimatedSidebarRail />
    </AnimatedSidebar>
  );
}
