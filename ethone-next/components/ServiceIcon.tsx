"use client";

import { Icon as IconifyIcon, type IconProps } from "@iconify/react";

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
  "google-calendar": "tabler:brand-google",
  "google-drive": "tabler:brand-google-drive",
  vscode: "tabler:brand-vscode",
  jira: "tabler:brand-jira",
  lastfm: "tabler:brand-lastfm",
  openai: "tabler:brand-openai",
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
  "google-calendar": "#4285F4",
  "google-drive": "#4285F4",
  vscode: "#007ACC",
  jira: "#0052CC",
  lastfm: "#D51007",
  openai: "#FFFFFF",
};

export default function ServiceIcon({
  id,
  icon,
  colored = true,
  className = "",
  ...props
}: { id: string; icon: string; colored?: boolean; className?: string } & Omit<IconProps, "icon">) {
  const iconId = OVERRIDES[id] || `lucide:${icon}`;
  const color = colored ? COLORS[id] : undefined;

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
