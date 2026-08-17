"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import BrandMark from "@/components/BrandMark";
import { NAVIGATION_ITEMS, isActiveRoute } from "@/lib/navigation";
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarRail,
  useAnimatedSidebar,
} from "@/components/motion/animated-sidebar";

export default function Sidebar() {
  const pathname = usePathname();
  const i18n = useI18n();
  const { settings } = useSettings();
  const { setOpen } = useAnimatedSidebar();

  if (settings.layoutPreset === "dock-only" || settings.layoutPreset === "minimal" || !settings.sidebarVisible) {
    return null;
  }

  const mainItems = NAVIGATION_ITEMS.filter((item) => item.id !== "settings");
  const settingsItem = NAVIGATION_ITEMS.find((item) => item.id === "settings");

  return (
    <AnimatedSidebar
      ariaLabel="ETHONE"
      collapsible="icon"
      className="!fixed left-0 top-0 z-40"
      panelClassName="border-[var(--panel-border)]"
      style={{ position: "fixed", left: 0, top: 0, height: "100dvh", zIndex: 40 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <AnimatedSidebarHeader className="p-3 pb-2">
        <div className="flex min-h-11 items-center gap-3 overflow-hidden px-2">
          <div className="grid size-9 shrink-0 place-items-center rounded-[var(--panel-radius)] bg-[var(--accent)] text-[var(--background)]">
            <BrandMark size={24} />
          </div>
          <span className="truncate text-lg font-semibold tracking-tight text-[var(--foreground)] group-data-[state=collapsed]/sidebar:hidden">
            ETHONE
          </span>
          <AnimatedSidebarClose className="ml-auto text-[var(--muted)] hover:bg-[var(--surface)] md:hidden">
            <Icon name="close" className="size-4" />
          </AnimatedSidebarClose>
        </div>
      </AnimatedSidebarHeader>

      <AnimatedSidebarContent className="px-2 py-2">
        <AnimatedSidebarGroup className="py-1.5">
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {mainItems.map((item) => (
                <AnimatedSidebarMenuItem key={item.id}>
                  <AnimatedSidebarMenuButton
                    href={item.href}
                    isActive={isActiveRoute(pathname ?? "/", item.href)}
                    icon={<Icon name={item.icon} className="size-5" />}
                  >
                    {i18n(item.label)}
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              ))}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      </AnimatedSidebarContent>

      <AnimatedSidebarFooter className="border-t border-[var(--panel-border)] p-3">
        {settingsItem && (
          <AnimatedSidebarMenu>
            <AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuButton
                href={settingsItem.href}
                isActive={isActiveRoute(pathname ?? "/", settingsItem.href)}
                icon={<Icon name={settingsItem.icon} className="size-5" />}
              >
                {i18n(settingsItem.label)}
              </AnimatedSidebarMenuButton>
            </AnimatedSidebarMenuItem>
          </AnimatedSidebarMenu>
        )}
      </AnimatedSidebarFooter>

      <AnimatedSidebarRail />
    </AnimatedSidebar>
  );
}
