import type { LiveRecord } from "@/lib/hooks/useLiveData";

export type PluginId =
  | "spotify"
  | "plex"
  | "jellyfin"
  | "emby"
  | "youtube"
  | "twitch"
  | "lastfm"
  | "discord"
  | "reddit"
  | "bluesky"
  | "steam"
  | "riot"
  | "minecraft"
  | "tracker-gg"
  | "google-calendar"
  | "google-drive"
  | "notion"
  | "todoist"
  | "linear"
  | "clickup"
  | "jira"
  | "email"
  | "rss"
  | "weather"
  | "github"
  | "gitlab"
  | "obsidian"
  | "vscode"
  | "fitbit"
  | "lm-studio"
  | "ollama"
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "valorant"
  | "lol"
  | "apex";

export type Plugin = {
  id: PluginId;
  label: string;
  icon: string;
  route: string;
  recordSource: string;
};

export const PLUGINS: Plugin[] = [
  // Media
  { id: "spotify", label: "Spotify", icon: "music", route: "/plugins/spotify/", recordSource: "nowplaying" },
  { id: "plex", label: "Plex", icon: "library", route: "/plugins/plex/", recordSource: "plex" },
  { id: "jellyfin", label: "Jellyfin", icon: "server", route: "/plugins/jellyfin/", recordSource: "jellyfin" },
  { id: "emby", label: "Emby", icon: "server-cog", route: "/plugins/emby/", recordSource: "emby" },
  { id: "youtube", label: "YouTube", icon: "play", route: "/plugins/youtube/", recordSource: "youtube" },
  { id: "twitch", label: "Twitch", icon: "radio", route: "/plugins/twitch/", recordSource: "twitch" },
  { id: "lastfm", label: "Last.fm", icon: "disc", route: "/plugins/lastfm/", recordSource: "lastfm" },

  // Social
  { id: "discord", label: "Discord", icon: "message-square", route: "/plugins/discord/", recordSource: "lanyard" },
  { id: "reddit", label: "Reddit", icon: "flame", route: "/plugins/reddit/", recordSource: "reddit" },
  { id: "bluesky", label: "Bluesky", icon: "cloud", route: "/plugins/bluesky/", recordSource: "bluesky" },

  // Gaming
  { id: "steam", label: "Steam", icon: "gamepad-2", route: "/plugins/steam/", recordSource: "steam" },
  { id: "riot", label: "Riot Games", icon: "swords", route: "/plugins/riot/", recordSource: "riot" },
  { id: "valorant", label: "Valorant", icon: "swords", route: "/plugins/valorant/", recordSource: "valorant" },
  { id: "lol", label: "League of Legends", icon: "shield", route: "/plugins/lol/", recordSource: "lol" },
  { id: "minecraft", label: "Minecraft", icon: "box", route: "/plugins/minecraft/", recordSource: "minecraft" },
  { id: "tracker-gg", label: "Tracker.gg", icon: "chart-no-axes-combined", route: "/plugins/tracker-gg/", recordSource: "tracker" },
  { id: "apex", label: "Apex Legends", icon: "target", route: "/plugins/apex/", recordSource: "apex" },

  // Productivity
  { id: "google-calendar", label: "Google Calendar", icon: "calendar", route: "/plugins/google-calendar/", recordSource: "google-calendar" },
  { id: "google-drive", label: "Google Drive", icon: "hard-drive", route: "/plugins/google-drive/", recordSource: "google-drive" },
  { id: "notion", label: "Notion", icon: "notebook-pen", route: "/plugins/notion/", recordSource: "notion" },
  { id: "todoist", label: "Todoist", icon: "circle-check", route: "/plugins/todoist/", recordSource: "todoist" },
  { id: "linear", label: "Linear", icon: "workflow", route: "/plugins/linear/", recordSource: "linear" },
  { id: "clickup", label: "ClickUp", icon: "list-todo", route: "/plugins/clickup/", recordSource: "clickup" },
  { id: "jira", label: "Jira", icon: "panels-top-left", route: "/plugins/jira/", recordSource: "jira" },
  { id: "email", label: "Email", icon: "mail", route: "/plugins/email/", recordSource: "email" },
  { id: "rss", label: "RSS", icon: "rss", route: "/plugins/rss/", recordSource: "rss" },
  { id: "weather", label: "Météo", icon: "cloud-sun", route: "/plugins/weather/", recordSource: "weather" },

  // Development
  { id: "github", label: "GitHub", icon: "code", route: "/plugins/github/", recordSource: "github" },
  { id: "gitlab", label: "GitLab", icon: "git-fork", route: "/plugins/gitlab/", recordSource: "gitlab" },
  { id: "obsidian", label: "Obsidian", icon: "gem", route: "/plugins/obsidian/", recordSource: "obsidian" },
  { id: "vscode", label: "VS Code", icon: "code-2", route: "/plugins/vscode/", recordSource: "vscode" },

  // Health
  { id: "fitbit", label: "Fitbit", icon: "heart-pulse", route: "/plugins/fitbit/", recordSource: "fitbit" },

  // AI
  { id: "lm-studio", label: "LM Studio", icon: "monitor-cog", route: "/plugins/lm-studio/", recordSource: "lm-studio" },
  { id: "ollama", label: "Ollama", icon: "bot", route: "/plugins/ollama/", recordSource: "ollama" },
  { id: "openai", label: "OpenAI", icon: "sparkles", route: "/plugins/openai/", recordSource: "openai" },
  { id: "anthropic", label: "Anthropic", icon: "brain-circuit", route: "/plugins/anthropic/", recordSource: "anthropic" },
  { id: "gemini", label: "Gemini", icon: "gem", route: "/plugins/gemini/", recordSource: "gemini" },
  { id: "groq", label: "Groq", icon: "gauge", route: "/plugins/groq/", recordSource: "groq" },
];

export function getPluginById(id: string): Plugin | undefined {
  return PLUGINS.find((p) => p.id === id);
}

export function getPluginRecord(records: LiveRecord[], plugin: Plugin): LiveRecord | undefined {
  return records.find((r) => r.source === plugin.recordSource);
}
