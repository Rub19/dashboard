import type { LiveRecord } from "@/lib/hooks/useLiveData";

export type PluginId =
  | "spotify"
  | "discord"
  | "github"
  | "google"
  | "notion"
  | "todoist"
  | "youtube"
  | "reddit"
  | "steam"
  | "valorant"
  | "lol"
  | "twitch"
  | "lastfm"
  | "weather";

export type Plugin = {
  id: PluginId;
  label: string;
  icon: string;
  route: string;
  recordSource: string;
};

export const PLUGINS: Plugin[] = [
  { id: "spotify", label: "Spotify", icon: "music", route: "/plugins/spotify/", recordSource: "nowplaying" },
  { id: "discord", label: "Discord", icon: "message-square", route: "/plugins/discord/", recordSource: "lanyard" },
  { id: "github", label: "GitHub", icon: "code", route: "/plugins/github/", recordSource: "github" },
  { id: "google", label: "Google", icon: "globe", route: "/plugins/google/", recordSource: "google" },
  { id: "notion", label: "Notion", icon: "notebook-pen", route: "/plugins/notion/", recordSource: "notion" },
  { id: "todoist", label: "Todoist", icon: "circle-check", route: "/plugins/todoist/", recordSource: "todoist" },
  { id: "youtube", label: "YouTube", icon: "play", route: "/plugins/youtube/", recordSource: "youtube" },
  { id: "reddit", label: "Reddit", icon: "flame", route: "/plugins/reddit/", recordSource: "reddit" },
  { id: "steam", label: "Steam", icon: "gamepad-2", route: "/plugins/steam/", recordSource: "steam" },
  { id: "valorant", label: "Valorant", icon: "swords", route: "/plugins/valorant/", recordSource: "valorant" },
  { id: "lol", label: "League of Legends", icon: "shield", route: "/plugins/lol/", recordSource: "lol" },
  { id: "twitch", label: "Twitch", icon: "radio", route: "/plugins/twitch/", recordSource: "twitch" },
  { id: "lastfm", label: "Last.fm", icon: "disc", route: "/plugins/lastfm/", recordSource: "lastfm" },
  { id: "weather", label: "Weather", icon: "cloud-sun", route: "/plugins/weather/", recordSource: "weather" },
];

export function getPluginById(id: string): Plugin | undefined {
  return PLUGINS.find((p) => p.id === id);
}

export function getPluginRecord(records: LiveRecord[], plugin: Plugin): LiveRecord | undefined {
  return records.find((r) => r.source === plugin.recordSource);
}
