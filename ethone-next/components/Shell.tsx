"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import { WindowManagerProvider } from "@/components/WindowManagerProvider";
import PresenceProvider from "@/components/PresenceProvider";
import { ShortcutsProvider } from "@/components/ShortcutsProvider";
import ProfileSync from "@/components/ProfileSync";
import Sidebar from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationCenter from "@/components/NotificationCenter";
import SidePanel from "@/components/SidePanel";
import CommandPalette from "@/components/CommandPalette";
import MobileNav from "@/components/MobileNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import V8Breadcrumbs from "@/components/V8Breadcrumbs";
import DocumentMetadata from "@/components/DocumentMetadata";
import { ActivityJournalProvider } from "@/components/ActivityJournalProvider";
import PageTransition from "@/components/PageTransition";
import AutomationRuntime from "@/components/AutomationRuntime";
import V8StatusBar from "@/components/V8StatusBar";
import Dock from "@/components/Dock";
import SkipLink from "@/components/SkipLink";

const LiveOverlay = dynamic(() => import("@/components/LiveOverlay"), { ssr: false });
const CosmicBackground = dynamic(() => import("@/components/CosmicBackground"), { ssr: false });
const Spotlight = dynamic(() => import("@/components/Spotlight"), { ssr: false });
const VisualHaptics = dynamic(() => import("@/components/VisualHaptics"), { ssr: false });
const DepthEffect = dynamic(() => import("@/components/DepthEffect"), { ssr: false });
const FocusIsland = dynamic(() => import("@/components/FocusIsland"), { ssr: false });
const ShortcutsOverlay = dynamic(() => import("@/components/ShortcutsOverlay"), { ssr: false });
const KeyboardShortcuts = dynamic(() => import("@/components/KeyboardShortcuts"), { ssr: false });

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <WindowManagerProvider>
      <PresenceProvider>
        <ShortcutsProvider>
          <SkipLink />
          <ProfileSync />
          <Sidebar />
            <div
              data-v8-shell
              className="min-h-dvh overflow-x-hidden transition-colors duration-150 duration-300 md:ml-[72px]"
            >
              <header
                data-v8-topbar
                className="v8-topbar sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between gap-2 rounded-b-2xl border-b border-[var(--panel-border)] bg-[var(--background)]/80 px-4 pt-safe backdrop-blur-md lg:px-6"
              >
                <V8Breadcrumbs />
                <SearchBar />
                <div className="flex min-w-0 items-center gap-2">
                  <NotificationCenter />
                  <SidePanel />
                  <CommandPalette />
                  <LanguageSwitcher />
                  <ProfileDropdown />
                </div>
              </header>
              <DocumentMetadata />
              <LiveOverlay />
              <CosmicBackground />
              <Spotlight />
              <VisualHaptics />
              <DepthEffect />
              <FocusIsland />
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
              <V8StatusBar />
            </div>
            <MobileNav />
            <Dock />
            <ShortcutsOverlay />
            <KeyboardShortcuts />
          </ShortcutsProvider>
        </PresenceProvider>
      </WindowManagerProvider>
    );
}
