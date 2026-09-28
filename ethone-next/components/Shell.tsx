"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "@/components/icons/ph";
import { WindowManagerProvider } from "@/components/WindowManagerProvider";
import PresenceProvider from "@/components/PresenceProvider";
import { ShortcutsProvider } from "@/components/ShortcutsProvider";
import PublicProfileProvider from "@/components/PublicProfileProvider";
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
  // Le Bot Discord s'ouvre en plein écran par-dessus le dashboard : ni sidebar, ni barre du haut, ni barre du bas.
  const discordFullscreen = pathname === "/discord" || (pathname?.startsWith("/discord/") ?? false);

  if (discordFullscreen) {
    return (
      <WindowManagerProvider>
        <NativeIntegration />
        <ContextMenuProvider>
          <PublicProfileProvider>
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
                  <header className="relative z-10 flex h-12 shrink-0 items-center gap-3 border-b border-[var(--panel-border)]/60 px-4">
                    <Link
                      href="/"
                      onClick={() => {
                        // Le prochain accès au Bot Discord repart du choix de serveur.
                        try {
                          sessionStorage.removeItem("ethone:discord:picked");
                        } catch {}
                      }}
                      className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3.5 text-xs font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/10 active:scale-95"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour à ETHONE
                    </Link>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Bot Discord</span>
                  </header>
                  <PrivacyShield>
                    <main
                      data-v8-main
                      id="main-content"
                      className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-transparent [overscroll-behavior:contain]"
                      tabIndex={-1}
                    >
                      <ActivityJournalProvider>
                        <PageTransition>{children}</PageTransition>
                        <AutomationRuntime />
                      </ActivityJournalProvider>
                    </main>
                  </PrivacyShield>
                </div>
                <ShortcutsOverlay />
                <KeyboardShortcuts />
              </ShortcutsProvider>
            </PresenceProvider>
          </PublicProfileProvider>
        </ContextMenuProvider>
      </WindowManagerProvider>
    );
  }

  return (
    <WindowManagerProvider>
      <NativeIntegration />
      <ContextMenuProvider>
        <PublicProfileProvider>
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
                  className="relative z-0 min-h-0 min-w-0 flex-1 flex flex-col overflow-y-auto overflow-x-hidden [overscroll-behavior:contain] bg-transparent pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0"
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
      </PublicProfileProvider>
      </ContextMenuProvider>
    </WindowManagerProvider>
  );
}
