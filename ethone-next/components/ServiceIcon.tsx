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
      <path d="M13.458.86L0 7.093l3.353 12.761l2.552-.313l-.701-8.024l.838-.373l1.447 8.202l4.361-.535l-.775-8.857l.83-.37l1.591 9.025l4.412-.542l-.849-9.708l.84-.374l1.74 9.87L24 17.318V3.5Zm.316 19.356l.222 1.256L24 23.14v-4.18l-10.22 1.256Z" />
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

  if (id === "riot" || id === "riotgames") {
    return <RiotGamesSvg className={className} color={color} />;
  }

  if (id === "valorant") {
    return <ValorantSvg className={className} color={color} />;
  }

  if (id === "tracker-gg" || id === "tracker.gg" || id === "tracker") {
    return <TrackerGgSvg className={className} color={color} />;
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
