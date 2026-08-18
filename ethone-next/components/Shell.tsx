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
            <SkipLink />
            <ProfileSync />
            <AnimatedSidebarProvider
              defaultOpen={true}
              style={{ "--sidebar-width-icon": "7.5rem" }}
              className="h-screen w-screen gap-3 overflow-hidden bg-black p-3 sm:gap-4 sm:p-4"
            >
              <Sidebar />
              <div
                data-v8-shell
                className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden transition-colors duration-150"
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
                  className="min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-[calc(7rem+env(safe-area-inset-bottom))]"
                  tabIndex={-1}
                >
                  <ActivityJournalProvider>
                    <PageTransition>{children}</PageTransition>
                    <AutomationRuntime />
                  </ActivityJournalProvider>
                </main>
                <StatusBar />
              </div>
            </AnimatedSidebarProvider>
            <MobileNav />
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
