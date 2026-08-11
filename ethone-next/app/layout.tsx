import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationCenter from "@/components/NotificationCenter";
import AuthProvider from "@/components/AuthProvider";
import ServiceWorker from "@/components/ServiceWorker";
import CommandPalette from "@/components/CommandPalette";
import MobileNav from "@/components/MobileNav";
import SettingsProvider from "@/components/SettingsProvider";
import { SoundProvider } from "@/lib/sound";
import { ToastProvider } from "@/components/ToastProvider";
import SkipLink from "@/components/SkipLink";
import OfflineIndicator from "@/components/OfflineIndicator";
import HtmlLang from "@/components/HtmlLang";
import CommandPaletteProvider from "@/components/CommandPaletteProvider";
import OAuthHandler from "@/components/OAuthHandler";
import LiveOverlay from "@/components/LiveOverlay";
import AmbientParticles from "@/components/AmbientParticles";
import Spotlight from "@/components/Spotlight";
import Dock from "@/components/Dock";
import UIProvider from "@/components/UIProvider";
import PageTransition from "@/components/PageTransition";
import { WindowManagerProvider } from "@/components/WindowManagerProvider";
import { WindowRenderer } from "@/components/WindowRenderer";
import ProfileSync from "@/components/ProfileSync";
import ShortcutsOverlay from "@/components/ShortcutsOverlay";
import { FocusProvider } from "@/components/FocusProvider";
import FocusIsland from "@/components/FocusIsland";
import VisualHaptics from "@/components/VisualHaptics";
import SidePanel from "@/components/SidePanel";
import PresenceProvider from "@/components/PresenceProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ethone.dev",
  description: "ETHONE Dashboard — Next-gen workspace",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <AuthProvider>
          <WindowManagerProvider>
          <FocusProvider>
          <OfflineIndicator />
          <SettingsProvider>
            <PresenceProvider>
            <UIProvider>
              <HtmlLang />
              <ProfileSync />
              <SoundProvider>
                <ToastProvider>
                  <SkipLink />
                <Sidebar />
                <div className="min-h-screen transition-all duration-300 md:ml-[72px]">
                  <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-6 backdrop-blur-md">
                    <CommandPaletteProvider>
                      <SearchBar />
                      <div className="flex items-center gap-3">
                        <NotificationCenter />
                        <SidePanel />
                        <CommandPalette />
                        <ProfileDropdown />
                      </div>
                    </CommandPaletteProvider>
                  </header>
                  <ServiceWorker />
                  <OAuthHandler />
                  <LiveOverlay />
                  <AmbientParticles />
                  <Spotlight />
                  <VisualHaptics />
                  <FocusIsland />
                  <main id="main-content" className="p-6 pb-24 md:pb-6" tabIndex={-1}>
                    <PageTransition>{children}</PageTransition>
                  </main>
                </div>
                <MobileNav />
                <Dock />
                <ShortcutsOverlay />
                </ToastProvider>
              </SoundProvider>
            </UIProvider>
            </PresenceProvider>
          </SettingsProvider>
          </FocusProvider>
          <WindowRenderer />
        </WindowManagerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
