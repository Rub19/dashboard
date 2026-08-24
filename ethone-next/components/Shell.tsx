"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import { WindowManagerProvider } from "@/components/WindowManagerProvider";
import PresenceProvider from "@/components/PresenceProvider";
import { ShortcutsProvider } from "@/components/ShortcutsProvider";
import PublicProfileProvider from "@/components/PublicProfileProvider";
import ProfileSync from "@/components/ProfileSync";
import { AnimatedSidebarProvider } from "@/components/motion/animated-sidebar";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CommandPalette from "@/components/CommandPalette";
import FloatingLiquidDock from "@/components/FloatingLiquidDock";
import DocumentMetadata from "@/components/DocumentMetadata";
import { ActivityJournalProvider } from "@/components/ActivityJournalProvider";
import PageTransition from "@/components/PageTransition";
import AutomationRuntime from "@/components/AutomationRuntime";
import Dock from "@/components/Dock";
import StatusBar from "@/components/layout/StatusBar";
import SkipLink from "@/components/SkipLink";
import ContextMenuProvider from "@/components/ContextMenuProvider";
import NativeIntegration from "@/components/NativeIntegration";
import PrivacyShield from "@/components/PrivacyShield";

import LiveWidgetSkeleton from "@/components/LiveWidgetSkeleton";
import DynamicIslandSkeleton from "@/components/DynamicIslandSkeleton";

const LiveWidget = dynamic(() => import("@/components/LiveWidget"), {
  ssr: false,
  loading: () => <LiveWidgetSkeleton />,
});
const CosmicBackground = dynamic(() => import("@/components/CosmicBackground"), { ssr: false });
const Spotlight = dynamic(() => import("@/components/Spotlight"), { ssr: false });
const VisualHaptics = dynamic(() => import("@/components/VisualHaptics"), { ssr: false });
const DynamicIslandContainer = dynamic(() => import("@/components/DynamicIslandContainer"), {
  ssr: false,
  loading: () => <DynamicIslandSkeleton />,
});
const ShortcutsOverlay = dynamic(() => import("@/components/ShortcutsOverlay"), { ssr: false });
const KeyboardShortcuts = dynamic(() => import("@/components/KeyboardShortcuts"), { ssr: false });

export default function Shell({ children }: { children: ReactNode }) {
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
                <VisualHaptics />
                <PrivacyShield>
                <main
                  data-v8-main
                  id="main-content"
                  className="relative z-0 min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden bg-[var(--background)] pb-32 md:pb-4"
                  tabIndex={-1}
                >
                  <DynamicIslandContainer />
                  <ActivityJournalProvider>
                    <PageTransition>{children}</PageTransition>
                    <AutomationRuntime />
                  </ActivityJournalProvider>
                </main>
                </PrivacyShield>
              </div>
            </AnimatedSidebarProvider>
            <FloatingLiquidDock />
            <Dock />
            <StatusBar />
            <ShortcutsOverlay />
            <KeyboardShortcuts />
          </ShortcutsProvider>
        </PresenceProvider>
      </PublicProfileProvider>
      </ContextMenuProvider>
    </WindowManagerProvider>
  );
}
