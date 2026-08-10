import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SearchBar from "@/components/SearchBar";
import ProfileDropdown from "@/components/ProfileDropdown";
import AuthProvider from "@/components/AuthProvider";
import ServiceWorker from "@/components/ServiceWorker";
import CommandPalette from "@/components/CommandPalette";
import MobileNav from "@/components/MobileNav";
import SettingsProvider from "@/components/SettingsProvider";
import { SoundProvider } from "@/lib/sound";
import SkipLink from "@/components/SkipLink";
import OfflineIndicator from "@/components/OfflineIndicator";
import CommandPaletteProvider from "@/components/CommandPaletteProvider";
import OAuthHandler from "@/components/OAuthHandler";
import LiveOverlay from "@/components/LiveOverlay";
import Dock from "@/components/Dock";
import PageTransition from "@/components/PageTransition";
import { WindowManagerProvider } from "@/components/WindowManagerProvider";
import { WindowRenderer } from "@/components/WindowRenderer";

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
          <OfflineIndicator />
          <SettingsProvider>
            <SoundProvider>
              <SkipLink />
              <Sidebar />
              <div className="min-h-screen transition-all duration-300 md:ml-[72px]">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-6 backdrop-blur-md">
                  <CommandPaletteProvider>
                    <SearchBar />
                    <div className="flex items-center gap-3">
                      <CommandPalette />
                      <ProfileDropdown />
                    </div>
                  </CommandPaletteProvider>
                </header>
                <ServiceWorker />
                <OAuthHandler />
                <LiveOverlay />
                <main id="main-content" className="p-6 pb-24 md:pb-6" tabIndex={-1}>
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
              <MobileNav />
              <Dock />
            </SoundProvider>
          </SettingsProvider>
          <WindowRenderer />
        </WindowManagerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
