import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./legacy-v8-tokens.css";
import "./legacy-v8-components-tokens.css";
import "./legacy-v8-depth-tokens.css";
import "./legacy-v8-presence-tokens.css";
import "./legacy-v8-mail-tokens.css";
import "./legacy-v8-shell-tokens.css";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import ServiceWorker from "@/components/ServiceWorker";
import SettingsProvider from "@/components/SettingsProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { FocusProvider } from "@/components/FocusProvider";
import { SoundProvider } from "@/lib/sound";
import { ToastProvider } from "@/context/ToastContext";
import OfflineIndicator from "@/components/OfflineIndicator";
import VersionUpdateToast from "@/components/VersionUpdateToast";
import HtmlLang from "@/components/HtmlLang";
import CommandPaletteProvider from "@/components/CommandPaletteProvider";
import OAuthHandler from "@/components/OAuthHandler";
import UIProvider from "@/components/UIProvider";
import NotificationBridge from "@/components/NotificationBridge";
import BootProvider from "@/components/BootProvider";
import PublicProfileProvider from "@/components/PublicProfileProvider";
import { UploadQueueProvider } from "@/lib/upload-queue";

const inter = Inter({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  display: "swap",
  subsets: ["latin"],
  preload: true,
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
    "msapplication-TileColor": "#08080a",
    "msapplication-TileImage": "/icons/ethone-icon-192.png",
    "theme-color": "#08080a",
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full max-h-dvh overflow-hidden antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('ethone_settings_v8')||localStorage.getItem('dashboard_settings');var theme='obsidian';var accent='#8b5cf6';if(s){var p=JSON.parse(s);if(p.theme)theme=p.theme;if(p.accentColor==='custom'&&p.customAccent)accent=p.customAccent;else if(p.accentColor){var m={violet:'#8b5cf6',blue:'#3b82f6',cyan:'#06b6d4',pink:'#ec4899',red:'#ef4444',orange:'#f97316',green:'#10b981',mint:'#34d399',amber:'#f59e0b',sky:'#38bdf8',teal:'#14b8a6',rose:'#f43f5e'};if(m[p.accentColor])accent=m[p.accentColor];}}var isLight=theme==='arctic'||(theme==='auto'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);var root=document.documentElement;root.setAttribute('data-theme',theme);root.setAttribute('data-color-scheme',isLight?'light':'dark');root.style.colorScheme=isLight?'light':'dark';root.style.setProperty('--accent',accent);root.style.setProperty('--accent-primary',accent);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-dvh max-h-dvh overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <AuthProvider>
          <PublicProfileProvider>
            <SettingsProvider>
              <LanguageProvider>
                <FocusProvider>
                  <UIProvider>
                    <CommandPaletteProvider>
                      <SoundProvider>
                        <ToastProvider>
                          <HtmlLang />
                          <OfflineIndicator />
                          <ServiceWorker />
                          <NotificationBridge />
                          <VersionUpdateToast />
                          <OAuthHandler />
                          <UploadQueueProvider>
                            <BootProvider>{children}</BootProvider>
                          </UploadQueueProvider>
                        </ToastProvider>
                      </SoundProvider>
                    </CommandPaletteProvider>
                  </UIProvider>
                </FocusProvider>
              </LanguageProvider>
            </SettingsProvider>
          </PublicProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
