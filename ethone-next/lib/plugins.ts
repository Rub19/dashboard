import type { LiveRecord } from "@/lib/hooks/useLiveData";

export type PluginId = "spotify" | "discord" | "github" | "todoist" | "youtube" | "reddit" | "weather";

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
  { id: "todoist", label: "Todoist", icon: "circle-check", route: "/plugins/todoist/", recordSource: "todoist" },
  { id: "youtube", label: "YouTube", icon: "play", route: "/plugins/youtube/", recordSource: "youtube" },
  { id: "reddit", label: "Reddit", icon: "message-circle", route: "/plugins/reddit/", recordSource: "reddit" },
  { id: "weather", label: "Weather", icon: "cloud-sun", route: "/plugins/weather/", recordSource: "weather" },
];

export function getPluginById(id: string): Plugin | undefined {
  return PLUGINS.find((p) => p.id === id);
}

export function getPluginRecord(records: LiveRecord[], plugin: Plugin): LiveRecord | undefined {
  return records.find((r) => r.source === plugin.recordSource);
}
