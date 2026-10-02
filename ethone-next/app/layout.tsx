import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope, Nunito, Oswald, Outfit, Playfair_Display, Poppins, Sora, Space_Grotesk } from "next/font/google";
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
import MotionPreference from "@/components/MotionPreference";
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

// Polices des thèmes "Burgundy" (condensée, façon la palette de référence) et "Asphalt" (grotesque
// arrondie bold) — chargées ici une seule fois pour toute l'app ; seul le thème actif applique la
// variable correspondante via --font-theme-override (voir lib/theme-engine.ts), les autres thèmes
// restent sur Inter sans rien télécharger en plus tant qu'ils ne sont pas sélectionnés.
const oswald = Oswald({
  variable: "--font-oswald",
  display: "swap",
  subsets: ["latin"],
  // 400 inclus : la police peut aussi être choisie comme police de toute l'interface (Apparence > Police).
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const poppins = Poppins({
  variable: "--font-poppins",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  preload: false,
});

const outfit = Outfit({
  variable: "--font-outfit",
  display: "swap",
  subsets: ["latin"],
  preload: false,
});

// Polices au choix (Apparence > Police, ou par thème via « Modifier ») : sans préchargement, le navigateur ne
// les télécharge que si elles sont réellement utilisées.
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", display: "swap", subsets: ["latin"], preload: false });
const manrope = Manrope({ variable: "--font-manrope", display: "swap", subsets: ["latin"], preload: false });
const sora = Sora({ variable: "--font-sora", display: "swap", subsets: ["latin"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", display: "swap", subsets: ["latin"], preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", display: "swap", subsets: ["latin"], preload: false });

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
    "msapplication-TileColor": "#0E1015",
    "msapplication-TileImage": "/icons/ethone-icon-192.png",
    "theme-color": "#0E1015",
    "color-scheme": "dark",
    "apple-mobile-web-app-title": "ETHONE",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E1015",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${jetbrainsMono.variable} ${oswald.variable} ${poppins.variable} ${outfit.variable} ${spaceGrotesk.variable} ${manrope.variable} ${sora.variable} ${nunito.variable} ${playfair.variable} h-full max-h-dvh overflow-hidden antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Discord "Component Link Embeds" — when someone pastes an ethone.dev
            link in Discord, this replaces the classic OpenGraph card with a
            Components V2 layout. Must be static, server-rendered markup:
            Discord's crawler reads the raw HTML and never executes JS. See
            https://github.com/discord/discord-api-docs/pull/8606. */}
        <script
          id="discord:component-embed"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              component: {
                type: 17,
                accent_color: 12657487,
                components: [
                  {
                    type: 9,
                    components: [
                      { type: 10, content: "# ETHONE" },
                      {
                        type: 10,
                        content:
                          "Dashboard Discord tout-en-un : modules, automatisations et pilotage en temps réel.",
                      },
                    ],
                    accessory: {
                      type: 11,
                      media: { url: "https://ethone.dev/icons/ethone-icon-192.png" },
                      description: "Logo ETHONE",
                    },
                  },
                  { type: 14, divider: true, spacing: 1 },
                  {
                    type: 1,
                    components: [
                      { type: 2, style: 5, label: "Ouvrir le Dashboard", url: "https://ethone.dev/login" },
                      { type: 2, style: 5, label: "Rejoindre le Discord", url: "https://discord.gg/WvEcyBuP45" },
                    ],
                  },
                ],
              },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            // Sous-domaine optionnel de la page vitrine du bot : sa racine affiche /bot.
            __html: `(function(){if(location.hostname==='discord.ethone.dev'&&(location.pathname==='/'||location.pathname==='/index.html'))location.replace('/bot');})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('ethone_settings_v8')||localStorage.getItem('dashboard_settings');var theme='dyno-rose';var accent='#C1234F';if(s){var p=JSON.parse(s);if(p.theme)theme=p.theme;if(p.accentColor==='custom'&&p.customAccent)accent=p.customAccent;else if(p.accentColor&&p.accentColor!=='auto'&&p.accentColor!=='dyno'){var m={violet:'#8b5cf6',blue:'#3b82f6',cyan:'#06b6d4',pink:'#ec4899',red:'#ef4444',orange:'#f97316',green:'#10b981',mint:'#34d399',amber:'#f59e0b',sky:'#38bdf8',teal:'#14b8a6',rose:'#f43f5e'};if(m[p.accentColor])accent=m[p.accentColor];}}var ta={'dyno-rose':'#C1234F',obsidian:'#8b5cf6',midnight:'#ffffff',aurora:'#2dd4bf','purple-space':'#c084fc',arctic:'#0369a1',carbon:'#94a3b8','cyber-neon':'#f43f5e',minimal:'#e4e4e7',glass:'#38bdf8',forest:'#10b981',sunset:'#f97316',rose:'#f43f5e'};if(s){var q=JSON.parse(s);if((!q.accentColor||q.accentColor==='auto'||q.accentColor==='dyno')&&ta[theme])accent=ta[theme];}var isLight=theme==='arctic'||(theme==='auto'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);var root=document.documentElement;var bgMap={'dyno-rose':'#0E1015',obsidian:'#08080a',midnight:'#000000',aurora:'#051014','purple-space':'#0a0614',arctic:'#f8fafc',carbon:'#0c0d10','cyber-neon':'#090611',minimal:'#121214',glass:'#06070a',forest:'#050f0a',sunset:'#100806',rose:'#12060a'};var bg=bgMap[theme]||'#0E1015';root.setAttribute('data-theme',theme);root.setAttribute('data-color-scheme',isLight?'light':'dark');root.style.colorScheme=isLight?'light':'dark';root.style.setProperty('--accent',accent);root.style.setProperty('--accent-primary',accent);root.style.setProperty('--glow-color','color-mix(in srgb, '+accent+' 25%, transparent)');root.style.setProperty('--background',bg);root.style.setProperty('--bg-main',bg);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-dvh max-h-dvh overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <AuthProvider>
          <PublicProfileProvider>
            <SettingsProvider>
              <MotionPreference>
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
              </MotionPreference>
            </SettingsProvider>
          </PublicProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
