import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import ServiceWorker from "@/components/ServiceWorker";
import SettingsProvider from "@/components/SettingsProvider";
import { FocusProvider } from "@/components/FocusProvider";
import { SoundProvider } from "@/lib/sound";
import { ToastProvider } from "@/components/ToastProvider";
import OfflineIndicator from "@/components/OfflineIndicator";
import HtmlLang from "@/components/HtmlLang";
import CommandPaletteProvider from "@/components/CommandPaletteProvider";
import OAuthHandler from "@/components/OAuthHandler";
import UIProvider from "@/components/UIProvider";
import BootProvider from "@/components/BootProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETHONE",
  description: "ETHONE réinvente votre environnement numérique : un espace unifié pour organiser, créer et avancer.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/ethone-icon.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/icons/favicon.ico", type: "image/x-icon" },
      { url: "/icons/ethone-favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/ethone-favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/ethone-apple-touch-180.png",
  },
  other: {
    "msapplication-TileColor": "#080a0d",
    "msapplication-TileImage": "/icons/ethone-icon-192.png",
    "theme-color": "#080a0d",
    "color-scheme": "dark",
    "apple-mobile-web-app-title": "ETHONE",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080a0d",
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
            <FocusProvider>
              <UIProvider>
                <CommandPaletteProvider>
                  <SoundProvider>
                    <ToastProvider>
                      <HtmlLang />
                      <OfflineIndicator />
                      <ServiceWorker />
                      <OAuthHandler />
                      <BootProvider>{children}</BootProvider>
                    </ToastProvider>
                  </SoundProvider>
                </CommandPaletteProvider>
              </UIProvider>
            </FocusProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
