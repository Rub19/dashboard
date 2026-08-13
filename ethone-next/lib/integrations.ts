export type IntegrationCategory = {
  id: string;
  label: string;
  icon: string;
};

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  { id: "all", label: "Toutes", icon: "blocks" },
  { id: "media", label: "Médias", icon: "music" },
  { id: "social", label: "Social", icon: "message-square" },
  { id: "gaming", label: "Gaming", icon: "gamepad-2" },
  { id: "productivity", label: "Productivité", icon: "briefcase-business" },
  { id: "development", label: "Développement", icon: "code-2" },
  { id: "health", label: "Santé", icon: "heart-pulse" },
  { id: "ai", label: "IA", icon: "brain" },
];

export type Integration = {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string;
  icon: string;
  liveSignal: string;
  officialUrl?: string;
};

export const INTEGRATIONS: Integration[] = [
  { id: "spotify", name: "Spotify", category: "media", status: "oauth", description: "descSpotify", icon: "music-2", liveSignal: "Lecture actuelle", officialUrl: "https://developer.spotify.com/" },
  { id: "plex", name: "Plex", category: "media", status: "api", description: "descPlex", icon: "library", liveSignal: "Lecture actuelle" },
  { id: "jellyfin", name: "Jellyfin", category: "media", status: "local", description: "descJellyfin", icon: "server", liveSignal: "Lecture actuelle" },
  { id: "emby", name: "Emby", category: "media", status: "local", description: "descEmby", icon: "server-cog", liveSignal: "Lecture actuelle" },
  { id: "youtube", name: "YouTube", category: "media", status: "oauth", description: "descYoutube", icon: "youtube", liveSignal: "Video publiée" },
  { id: "twitch", name: "Twitch", category: "media", status: "oauth", description: "descTwitch", icon: "twitch", liveSignal: "Live demarre" },
  { id: "lastfm", name: "Last.fm", category: "media", status: "api", description: "descLastfm", icon: "history", liveSignal: "Scrobble" },
  { id: "discord", name: "Discord", category: "social", status: "oauth", description: "descDiscord", icon: "messages-square", liveSignal: "Presence" },
  { id: "reddit", name: "Reddit", category: "social", status: "oauth", description: "descReddit", icon: "message-circle", liveSignal: "Publication" },
  { id: "bluesky", name: "Bluesky", category: "social", status: "api", description: "descBluesky", icon: "cloud", liveSignal: "Publication" },
  { id: "steam", name: "Steam", category: "gaming", status: "api", description: "descSteam", icon: "gamepad-2", liveSignal: "Jeu lance" },
  { id: "riot", name: "Riot Games", category: "gaming", status: "api", description: "descRiot", icon: "swords", liveSignal: "Partie terminée" },
  { id: "minecraft", name: "Minecraft", category: "gaming", status: "oauth", description: "descMinecraft", icon: "box", liveSignal: "Session" },
  { id: "tracker-gg", name: "Tracker.gg", category: "gaming", status: "restricted", description: "descTracker", icon: "chart-no-axes-combined", liveSignal: "Classement mis a jour" },
  { id: "google-calendar", name: "Google Calendar", category: "productivity", status: "oauth", description: "descGoogleCalendar", icon: "calendar-days", liveSignal: "Événement" },
  { id: "google-drive", name: "Google Drive", category: "productivity", status: "oauth", description: "descGoogleDrive", icon: "hard-drive", liveSignal: "Fichier modifié" },
  { id: "notion", name: "Notion", category: "productivity", status: "oauth", description: "descNotion", icon: "notebook-tabs", liveSignal: "Page modifiée" },
  { id: "todoist", name: "Todoist", category: "productivity", status: "oauth", description: "descTodoist", icon: "circle-check-big", liveSignal: "Tache terminée" },
  { id: "linear", name: "Linear", category: "productivity", status: "oauth", description: "descLinear", icon: "workflow", liveSignal: "Issue modifiée" },
  { id: "clickup", name: "ClickUp", category: "productivity", status: "oauth", description: "descClickUp", icon: "list-todo", liveSignal: "Tache modifiée" },
  { id: "jira", name: "Jira", category: "productivity", status: "oauth", description: "descJira", icon: "panels-top-left", liveSignal: "Issue modifiée" },
  { id: "email", name: "Email", category: "productivity", status: "oauth", description: "descEmail", icon: "mail", liveSignal: "Nouveau message" },
  { id: "rss", name: "RSS", category: "productivity", status: "feed", description: "descRss", icon: "rss", liveSignal: "Nouvel article" },
  { id: "weather", name: "Météo", category: "productivity", status: "api", description: "descWeather", icon: "cloud-sun", liveSignal: "Alerte météo" },
  { id: "github", name: "GitHub", category: "development", status: "oauth", description: "descGithub", icon: "github", liveSignal: "Commit" },
  { id: "gitlab", name: "GitLab", category: "development", status: "oauth", description: "descGitLab", icon: "git-fork", liveSignal: "Commit" },
  { id: "obsidian", name: "Obsidian", category: "development", status: "local", description: "descObsidian", icon: "gem", liveSignal: "Note modifiée" },
  { id: "vscode", name: "VS Code", category: "development", status: "local", description: "descVscode", icon: "code-2", liveSignal: "Session de code" },
  { id: "fitbit", name: "Fitbit", category: "health", status: "oauth", description: "descFitbit", icon: "heart-pulse", liveSignal: "Objectif atteint" },
  { id: "lm-studio", name: "LM Studio", category: "ai", status: "local", description: "descLmStudio", icon: "monitor-cog", liveSignal: "Execution locale" },
  { id: "ollama", name: "Ollama", category: "ai", status: "local", description: "descOllama", icon: "bot", liveSignal: "Execution locale" },
  { id: "openai", name: "OpenAI", category: "ai", status: "api", description: "descOpenai", icon: "sparkles", liveSignal: "Execution terminée" },
  { id: "anthropic", name: "Anthropic", category: "ai", status: "api", description: "descAnthropic", icon: "brain-circuit", liveSignal: "Execution terminée" },
  { id: "gemini", name: "Gemini", category: "ai", status: "api", description: "descGemini", icon: "gem", liveSignal: "Execution terminée" },
  { id: "groq", name: "Groq", category: "ai", status: "api", description: "descGroq", icon: "gauge", liveSignal: "Execution terminée" },
];

export const OFFICIAL_HOME: Record<string, string> = {
  spotify: "https://developer.spotify.com/",
  plex: "https://www.plex.tv/",
  jellyfin: "https://jellyfin.org/docs/",
  emby: "https://dev.emby.media/",
  youtube: "https://developers.google.com/youtube/v3",
  twitch: "https://dev.twitch.tv/docs/",
  lastfm: "https://www.last.fm/api",
  discord: "https://docs.discord.com/developers/",
  reddit: "https://www.reddit.com/dev/api/",
  bluesky: "https://docs.bsky.app/",
  steam: "https://steamcommunity.com/dev",
  riot: "https://developer.riotgames.com/",
  minecraft: "https://learn.microsoft.com/minecraft/creator/",
  "tracker-gg": "https://tracker.gg/developers",
  "google-calendar": "https://developers.google.com/workspace/calendar/api",
  "google-drive": "https://developers.google.com/drive/api/guides/about-sdk",
  notion: "https://developers.notion.com/",
  todoist: "https://developer.todoist.com/",
  linear: "https://developers.linear.app/docs/",
  clickup: "https://developer.clickup.com/",
  jira: "https://developer.atlassian.com/cloud/jira/platform/",
  email: "https://developers.google.com/gmail/api",
  rss: "https://www.rssboard.org/rss-specification",
  weather: "https://open-meteo.com/en/docs",
  github: "https://docs.github.com/en/apps",
  gitlab: "https://docs.gitlab.com/integration/oauth_provider/",
  obsidian: "https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin",
  vscode: "https://code.visualstudio.com/api",
  fitbit: "https://dev.fitbit.com/build/reference/web-api/",
  "lm-studio": "https://lmstudio.ai/docs/developer",
  ollama: "https://docs.ollama.com/api",
  openai: "https://platform.openai.com/docs/",
  anthropic: "https://docs.anthropic.com/",
  gemini: "https://ai.google.dev/gemini-api/docs",
  groq: "https://console.groq.com/docs",
};

export function integrationById(id: string): Integration | null {
  return INTEGRATIONS.find((integration) => integration.id === id) || null;
}

export function integrationCategory(id: string): IntegrationCategory {
  return INTEGRATION_CATEGORIES.find((c) => c.id === id) || INTEGRATION_CATEGORIES[0];
}
