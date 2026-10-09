"use client";

import { Suspense, type ComponentType } from "react";
import dynamic from "next/dynamic";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";
import { EmbedContext } from "./embedContext";

/**
 * Page complète d'un module affichée dans la console (barre latérale Keeper conservée) au lieu de l'ancien écran
 * « passerelle ». Les pages lisent le serveur dans l'URL (?guildId=) comme en pleine page ; en mode console, leur lien
 * « Retour » et leur sélecteur de serveur sont masqués (la console a les siens) et leurs blocs prennent le style Keeper
 * (règles `.console-embed` dans globals.css).
 */

const load = (loader: () => Promise<ComponentType | { default: ComponentType }>) =>
  dynamic(loader, { ssr: false, loading: () => <ModuleSkeleton label="Chargement du module" /> });

const PAGES: Record<string, ComponentType> = {
  overview: load(() => import("@/app/discord/overview/OverviewClient")),
  commands: load(() => import("@/app/discord/commands/CommandsCenterClient")),
  analytics: load(() => import("@/app/discord/analytics/AnalyticsCenterClient")),
  automodnative: load(() => import("@/app/discord/automod-native/AutomodNativeClient")),
  calendar: load(() => import("@/app/discord/calendar/DiscordCalendarClient")),
  bot: load(() => import("@/app/discord/bot/BotControlClient").then((m) => function BotControlEmbed() {
    return <m.default initialTab="overview" />;
  })),
};

/** Modules refaits en pages natives de la console (format Keeper) : ils reçoivent le serveur directement. */
const native = (loader: () => Promise<{ default: ComponentType<{ guildId: string }> }>) =>
  dynamic(loader, { ssr: false, loading: () => <ModuleSkeleton label="Chargement du module" /> });
const NATIVE: Record<string, ComponentType<{ guildId: string }>> = {
  suggestions: native(() => import("./modules/ConsoleSuggestions")),
  roles: native(() => import("./modules/ConsoleRoles")),
  invites: native(() => import("./modules/ConsoleInvites")),
  welcome: native(() => import("./modules/ConsoleWelcome")),
  moderation: native(() => import("./modules/ConsoleModeration")),
  tickets: native(() => import("./modules/ConsoleTickets")),
  economy: native(() => import("./modules/ConsoleEconomy")),
  games: native(() => import("./modules/ConsoleGames")),
  leveling: native(() => import("./modules/ConsoleLeveling")),
  giveaways: native(() => import("./modules/ConsoleGiveaways")),
  music: native(() => import("./modules/ConsoleMusic")),
  polls: native(() => import("./modules/ConsolePolls")),
  forms: native(() => import("./modules/ConsoleForms")),
  voice: native(() => import("./modules/ConsoleVoice")),
  starboard: native(() => import("./modules/ConsoleStarboard")),
  afk: native(() => import("./modules/ConsoleAfk")),
  birthdays: native(() => import("./modules/ConsoleBirthdays")),
  tags: native(() => import("./modules/ConsoleTags")),
  reminders: native(() => import("./modules/ConsoleReminders")),
  counting: native(() => import("./modules/ConsoleCounting")),
  sticky: native(() => import("./modules/ConsoleSticky")),
  serverstats: native(() => import("./modules/ConsoleServerStats")),
  highlights: native(() => import("./modules/ConsoleHighlights")),
  stats: native(() => import("./modules/ConsoleStats")),
  statroles: native(() => import("./modules/ConsoleStatroles")),
  secureroles: native(() => import("./modules/ConsoleSecureRoles")),
  events: native(() => import("./modules/ConsoleEvents")),
  streamers: native(() => import("./modules/ConsoleStreamers")),
  backups: native(() => import("./modules/ConsoleBackups")),
  server: native(() => import("./modules/ConsoleServer")),
  ai: native(() => import("./modules/ConsoleAi")),
  // Le journal complet est un onglet de la page Logs de la console.
  logs: native(() => import("./ConsoleLogs").then((m) => ({ default: ({ guildId }: { guildId: string }) => <m.default guildId={guildId} initialTab="journal" /> }))),
  // Les paramètres du bot sont regroupés dans la page Réglages de la console.
  settings: native(() => import("./ConsoleSettings")),
};

export const hasEmbeddedPage = (moduleId: string) => moduleId in PAGES || moduleId in NATIVE;

export default function ModuleEmbed({ moduleId, guildId }: { moduleId: string; guildId: string }) {
  const Native = NATIVE[moduleId];
  if (Native) return <Native guildId={guildId} />;
  const Page = PAGES[moduleId];
  if (!Page) return null;
  return (
    <EmbedContext.Provider value={true}>
      <div className="console-embed">
        <Suspense fallback={<ModuleSkeleton label="Chargement du module" />}>
          <Page />
        </Suspense>
      </div>
    </EmbedContext.Provider>
  );
}
