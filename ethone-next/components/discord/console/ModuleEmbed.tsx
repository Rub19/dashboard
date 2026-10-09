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
  logs: load(() => import("@/app/discord/logs/AuditCenterClient").then((m) => m.AuditCenterClient)),
  backups: load(() => import("@/app/discord/backups/BackupsCenterClient")),
  ai: load(() => import("@/app/discord/ai/AiCenterClient")),
  analytics: load(() => import("@/app/discord/analytics/AnalyticsCenterClient")),
  events: load(() => import("@/app/discord/events/EventsCenterClient")),
  server: load(() => import("@/app/discord/server/ServerManagementClient")),
  sticky: load(() => import("@/app/discord/sticky/StickyCenterClient")),
  reminders: load(() => import("@/app/discord/reminders/RemindersCenterClient")),
  afk: load(() => import("@/app/discord/afk/AfkCenterClient")),
  counting: load(() => import("@/app/discord/counting/CountingCenterClient")),
  stats: load(() => import("@/app/discord/stats/StatsCenterClient")),
  statroles: load(() => import("@/app/discord/statroles/StatrolesCenterClient")),
  secureroles: load(() => import("@/app/discord/secure-roles/SecureRolesCenterClient")),
  settings: load(() => import("@/app/discord/settings/SettingsCenterClient")),
  birthdays: load(() => import("@/app/discord/birthdays/BirthdaysCenterClient")),
  tags: load(() => import("@/app/discord/tags/TagsCenterClient")),
  serverstats: load(() => import("@/app/discord/server-stats/ServerStatsCenterClient")),
  automodnative: load(() => import("@/app/discord/automod-native/AutomodNativeClient")),
  highlights: load(() => import("@/app/discord/highlights/HighlightsCenterClient")),
  calendar: load(() => import("@/app/discord/calendar/DiscordCalendarClient")),
  streamers: load(() => import("@/app/discord/streamers/StreamersCenterClient")),
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
