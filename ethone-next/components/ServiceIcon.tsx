"use client";

import { Icon as IconifyIcon, type IconProps } from "@iconify/react";

function RiotGamesSvg({ className, color }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color || "#EB0029"}
      className={className}
      aria-hidden="true"
    >
      <path d="M13.433 0l-5.32 7.037L10.05 10.95 0 14.152l3.414 7.604 5.92-2.183-1.042 4.427 10.871-3.693 4.837-18.06zM22.756 24L17.7 22.046l.732-2.884 4.324 1.48z" />
    </svg>
  );
}

function ValorantSvg({ className, color }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color || "#FF4655"}
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2l12 20h-7l-5-8.5-5 8.5H0L12 2z" />
    </svg>
  );
}

const OVERRIDES: Record<string, string> = {
  spotify: "tabler:brand-spotify",
  youtube: "tabler:brand-youtube",
  twitch: "tabler:brand-twitch",
  discord: "tabler:brand-discord",
  reddit: "tabler:brand-reddit",
  bluesky: "tabler:brand-bluesky",
  steam: "tabler:brand-steam",
  minecraft: "tabler:brand-minecraft",
  github: "tabler:brand-github",
  gitlab: "tabler:brand-gitlab",
  notion: "tabler:brand-notion",
  todoist: "simple-icons:todoist",
  "google-calendar": "tabler:brand-google",
  "google-drive": "tabler:brand-google-drive",
  vscode: "tabler:brand-vscode",
  jira: "tabler:brand-jira",
  lastfm: "tabler:brand-lastfm",
  openai: "tabler:brand-openai",
  plex: "simple-icons:plex",
  jellyfin: "simple-icons:jellyfin",
  emby: "simple-icons:emby",
  linear: "simple-icons:linear",
  clickup: "simple-icons:clickup",
  obsidian: "simple-icons:obsidian",
  fitbit: "simple-icons:fitbit",
  anthropic: "simple-icons:anthropic",
  gemini: "simple-icons:googlegemini",
  groq: "simple-icons:groq",
  ollama: "simple-icons:ollama",
  "lm-studio": "tabler:brain",
  email: "tabler:mail",
  weather: "tabler:cloud-sun",
  rss: "tabler:rss",
  "tracker-gg": "simple-icons:trackeregg",
  tracker: "simple-icons:trackeregg",
};

const COLORS: Record<string, string> = {
  spotify: "#1DB954",
  youtube: "#FF0000",
  twitch: "#9146FF",
  discord: "#5865F2",
  reddit: "#FF4500",
  bluesky: "#0085FF",
  steam: "#66C0F4",
  minecraft: "#62B47A",
  github: "#FFFFFF",
  gitlab: "#FC6D26",
  notion: "#FFFFFF",
  todoist: "#E44332",
  "google-calendar": "#4285F4",
  "google-drive": "#4285F4",
  vscode: "#007ACC",
  jira: "#0052CC",
  lastfm: "#D51007",
  openai: "#10A37F",
  plex: "#E5A00D",
  jellyfin: "#00A4DC",
  emby: "#52B54B",
  linear: "#5E6AD2",
  clickup: "#7B68EE",
  obsidian: "#7C3AED",
  fitbit: "#00B0B9",
  anthropic: "#D97706",
  gemini: "#1BA1E2",
  groq: "#F55036",
  ollama: "#FFFFFF",
  "lm-studio": "#8B5CF6",
  email: "#EA4335",
  weather: "#FFB020",
  rss: "#FFA500",
  riot: "#EB0029",
  riotgames: "#EB0029",
  "tracker-gg": "#FF2E55",
  valorant: "#FF4655",
};

export default function ServiceIcon({
  id,
  icon,
  colored = true,
  className = "",
  ...props
}: { id: string; icon: string; colored?: boolean; className?: string } & Omit<IconProps, "icon">) {
  const color = colored ? COLORS[id] : undefined;

  if (id === "riot" || id === "riotgames") {
    return <RiotGamesSvg className={className} color={color} />;
  }

  if (id === "valorant") {
    return <ValorantSvg className={className} color={color} />;
  }

  const iconId = OVERRIDES[id] || `lucide:${icon}`;

  return (
    <IconifyIcon
      icon={iconId}
      className={className}
      style={{ color }}
      aria-hidden="true"
      {...props}
    />
  );
}
