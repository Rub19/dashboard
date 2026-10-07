"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "@/components/icons/ph";
import { WindowManagerProvider } from "@/components/WindowManagerProvider";
import PresenceProvider from "@/components/PresenceProvider";
import { ShortcutsProvider } from "@/components/ShortcutsProvider";
import ProfileSync from "@/components/ProfileSync";
import { AnimatedSidebarProvider } from "@/components/motion/animated-sidebar";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CommandPalette from "@/components/CommandPalette";
import RefreshSpinner from "@/components/RefreshSpinner";
import FloatingLiquidDock from "@/components/FloatingLiquidDock";
import DocumentMetadata from "@/components/DocumentMetadata";
import { ActivityJournalProvider } from "@/components/ActivityJournalProvider";
import PageTransition from "@/components/PageTransition";
import AutomationRuntime from "@/components/AutomationRuntime";
import Dock from "@/components/Dock";
import SkipLink from "@/components/SkipLink";
import StatusBar from "@/components/layout/StatusBar";

import ContextMenuProvider from "@/components/ContextMenuProvider";
import NativeIntegration from "@/components/NativeIntegration";
import PrivacyShield from "@/components/PrivacyShield";

import LiveWidgetSkeleton from "@/components/LiveWidgetSkeleton";
import ModalAwareChrome from "@/components/ModalAwareChrome";

const LiveWidget = dynamic(() => import("@/components/LiveWidget"), {
  ssr: false,
  loading: () => <LiveWidgetSkeleton />,
});
const CosmicBackground = dynamic(() => import("@/components/CosmicBackground"), { ssr: false });
const Spotlight = dynamic(() => import("@/components/Spotlight"), { ssr: false });
const VisualHaptics = dynamic(() => import("@/components/VisualHaptics"), { ssr: false });
const DynamicIslandContainer = dynamic(() => import("@/components/DynamicIslandContainer"), { ssr: false });
const ShortcutsOverlay = dynamic(() => import("@/components/ShortcutsOverlay"), { ssr: false });
const KeyboardShortcuts = dynamic(() => import("@/components/KeyboardShortcuts"), { ssr: false });

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const discordFullscreen = pathname === "/discord" || pathname === "/bot" || (pathname?.startsWith("/discord/") ?? false) || (pathname?.startsWith("/bot/") ?? false);

  if (discordFullscreen) {
    return (
      <WindowManagerProvider>
        <NativeIntegration />
        <ContextMenuProvider>
            <PresenceProvider>
              <ShortcutsProvider>
                <SkipLink />
                <ProfileSync />
                <div data-v8-shell data-discord-fullscreen className="flex h-dvh max-h-dvh w-screen max-w-full flex-col overflow-clip bg-[var(--background)]">
                  <CommandPalette />
                  <DocumentMetadata />
                  <CosmicBackground />
                  <RefreshSpinner />
                  <VisualHaptics />
                  <a
                    href="/"
                    onClick={(e) => {
                      try {
                        sessionStorage.removeItem("ethone:discord:picked");
                      } catch {
                      }
                      if (typeof window !== "undefined" && window.location.hostname === "discord.ethone.dev") {
                        e.preventDefault();
                        window.location.assign("https://ethone.dev/");
                      }
                    }}
                    className="fixed bottom-4 right-4 z-50 flex items-center gap-2 border border-[var(--panel-border)] bg-[var(--surface-raised)]/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] shadow-lg transition-all rounded-sm cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Retour à ETHONE</span>
                  </a>
                  <PrivacyShield>
                    <main
                      data-v8-main
                      id="main-content"
                      className="relative z-0 flex h-full min-h-0 min-w-0 flex-1 flex-col outline-none overflow-y-auto md:overflow-hidden bg-transparent [overscroll-behavior:contain]"
                      tabIndex={-1}
                    >
                      <ActivityJournalProvider>
                        <PageTransition>
                          <div className="h-full min-h-0 w-full flex-1 flex flex-col overflow-y-auto md:overflow-hidden">{children}</div>
                        </PageTransition>
                        <AutomationRuntime />
                      </ActivityJournalProvider>
                    </main>
                  </PrivacyShield>
                </div>
                <ShortcutsOverlay />
                <KeyboardShortcuts />
              </ShortcutsProvider>
            </PresenceProvider>
        </ContextMenuProvider>
      </WindowManagerProvider>
    );
  }

  return (
    <WindowManagerProvider>
      <NativeIntegration />
      <ContextMenuProvider>
        <PresenceProvider>
          <ShortcutsProvider>
            <SkipLink />
            <ProfileSync />
            <AnimatedSidebarProvider
              defaultOpen={false}
              style={{ "--sidebar-width": "18rem", "--sidebar-width-icon": "5rem" }}
              className="h-dvh max-h-dvh w-screen max-w-full overflow-clip bg-[var(--background)] p-0"
            >
              <Sidebar />
              <div
                data-v8-shell
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-clip transition-colors duration-150"
              >
                <TopBar />
                <CommandPalette />
                <DocumentMetadata />
                <LiveWidget />
                <CosmicBackground />
                <Spotlight />
                <RefreshSpinner />
                <VisualHaptics />
                <PrivacyShield>
                <main
                  data-v8-main
                  id="main-content"
                  className="relative z-0 min-h-0 min-w-0 flex-1 flex flex-col outline-none overflow-y-auto overflow-x-hidden [overscroll-behavior:contain] bg-transparent pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0"
                  tabIndex={-1}
                >
                  <ActivityJournalProvider>
                    <PageTransition>{children}</PageTransition>
                    <AutomationRuntime />
                  </ActivityJournalProvider>
                </main>
                <StatusBar />
                </PrivacyShield>
              </div>
            </AnimatedSidebarProvider>
            <ModalAwareChrome />
            <DynamicIslandContainer />
            <FloatingLiquidDock />
            <Dock />
            <ShortcutsOverlay />
            <KeyboardShortcuts />
          </ShortcutsProvider>
        </PresenceProvider>
      </ContextMenuProvider>
    </WindowManagerProvider>
  );
}
