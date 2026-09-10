"use client";

import { Icon as IconifyIcon, type IconProps } from "@iconify/react";

// tracker.gg has no Simple Icons entry — keep a hand-drawn mark for it.
function TrackerGgSvg({ className, color }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="6" fill={color || "#FF2E55"} fillOpacity="0.16" />
      <path
        d="M12 3.5L19.5 7.8V16.2L12 20.5L4.5 16.2V7.8L12 3.5Z"
        stroke={color || "#FF2E55"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.5" stroke={color || "#FF2E55"} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.3" fill={color || "#FF2E55"} />
    </svg>
  );
}

function WeatherSvg({ className, color }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || "#FFB020"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

const OVERRIDES: Record<string, string> = {
  spotify: "simple-icons:spotify",
  youtube: "simple-icons:youtube",
  twitch: "simple-icons:twitch",
  discord: "simple-icons:discord",
  reddit: "simple-icons:reddit",
  bluesky: "simple-icons:bluesky",
  steam: "simple-icons:steam",
  minecraft: "simple-icons:minecraft",
  github: "simple-icons:github",
  gitlab: "simple-icons:gitlab",
  notion: "simple-icons:notion",
  todoist: "simple-icons:todoist",
  "google-calendar": "simple-icons:googlecalendar",
  googlecalendar: "simple-icons:googlecalendar",
  "google-drive": "simple-icons:googledrive",
  googledrive: "simple-icons:googledrive",
  vscode: "simple-icons:visualstudiocode",
  jira: "simple-icons:jira",
  lastfm: "simple-icons:lastdotfm",
  openai: "simple-icons:openai",
  plex: "simple-icons:plex",
  jellyfin: "simple-icons:jellyfin",
  emby: "simple-icons:emby",
  linear: "simple-icons:linear",
  clickup: "simple-icons:clickup",
  obsidian: "simple-icons:obsidian",
  fitbit: "simple-icons:fitbit",
  anthropic: "simple-icons:anthropic",
  gemini: "simple-icons:googlegemini",
  groq: "lucide:cpu", // no official brand mark in Simple Icons
  ollama: "simple-icons:ollama",
  "lm-studio": "simple-icons:lmstudio",
  riot: "simple-icons:riotgames",
  riotgames: "simple-icons:riotgames",
  valorant: "simple-icons:valorant",
  email: "tabler:mail",
  weather: "tabler:cloud-sun",
  rss: "tabler:rss",
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
  "tracker.gg": "#FF2E55",
  tracker: "#FF2E55",
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

  if (id === "tracker-gg" || id === "tracker.gg" || id === "tracker") {
    return <TrackerGgSvg className={className} color={color} />;
  }

  if (id === "weather") {
    return <WeatherSvg className={className} color={color} />;
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
