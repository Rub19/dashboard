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
          <SettingsProvider>
            <Sidebar />
          <div className="min-h-screen transition-all duration-300 md:ml-[72px]">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-6 backdrop-blur-md">
              <SearchBar />
              <div className="flex items-center gap-3">
                <CommandPalette />
                <ProfileDropdown />
              </div>
            </header>
            <ServiceWorker />
            <main className="p-6 pb-24 md:pb-6">{children}</main>
          </div>
          <MobileNav />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
