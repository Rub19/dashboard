"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import { WindowManagerProvider } from "@/components/WindowManagerProvider";
import PresenceProvider from "@/components/PresenceProvider";
import { ShortcutsProvider } from "@/components/ShortcutsProvider";
import PublicProfileProvider from "@/components/PublicProfileProvider";
import ProfileSync from "@/components/ProfileSync";
import Sidebar from "@/components/Sidebar";
import { AnimatedSidebarProvider } from "@/components/motion/animated-sidebar";
import TopBar from "@/components/TopBar";
import CommandPalette from "@/components/CommandPalette";
import MobileNav from "@/components/MobileNav";
import DocumentMetadata from "@/components/DocumentMetadata";
import { ActivityJournalProvider } from "@/components/ActivityJournalProvider";
import PageTransition from "@/components/PageTransition";
import AutomationRuntime from "@/components/AutomationRuntime";
import StatusBar from "@/components/layout/StatusBar";
import Dock from "@/components/Dock";
import SkipLink from "@/components/SkipLink";
import ContextMenuProvider from "@/components/ContextMenuProvider";

const LiveWidget = dynamic(() => import("@/components/LiveWidget"), { ssr: false });
const CosmicBackground = dynamic(() => import("@/components/CosmicBackground"), { ssr: false });
const Spotlight = dynamic(() => import("@/components/Spotlight"), { ssr: false });
const VisualHaptics = dynamic(() => import("@/components/VisualHaptics"), { ssr: false });
const DynamicIslandContainer = dynamic(() => import("@/components/DynamicIslandContainer"), { ssr: false });
const ShortcutsOverlay = dynamic(() => import("@/components/ShortcutsOverlay"), { ssr: false });
const KeyboardShortcuts = dynamic(() => import("@/components/KeyboardShortcuts"), { ssr: false });

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <WindowManagerProvider>
      <ContextMenuProvider>
        <PublicProfileProvider>
        <PresenceProvider>
          <ShortcutsProvider>
            <AnimatedSidebarProvider className="contents" defaultOpen={false} style={{ "--sidebar-width-icon": "4.5rem" }}>
              <SkipLink />
              <ProfileSync />
              <Sidebar />
              <div
                data-v8-shell
                className="min-h-dvh overflow-x-hidden transition-colors duration-150 duration-300 md:ml-[72px]"
              >
                <TopBar />
                <CommandPalette />
                <DocumentMetadata />
                <LiveWidget />
                <CosmicBackground />
                <Spotlight />
                <VisualHaptics />
                <DynamicIslandContainer />
                <main
                  data-v8-main
                  id="main-content"
                  className="w-full overflow-x-hidden p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-32"
                  tabIndex={-1}
                >
                  <ActivityJournalProvider>
                    <PageTransition>{children}</PageTransition>
                    <AutomationRuntime />
                  </ActivityJournalProvider>
                </main>
                <StatusBar />
              </div>
              <MobileNav />
              <Dock />
              <ShortcutsOverlay />
              <KeyboardShortcuts />
            </AnimatedSidebarProvider>
          </ShortcutsProvider>
        </PresenceProvider>
      </PublicProfileProvider>
      </ContextMenuProvider>
    </WindowManagerProvider>
  );
}
