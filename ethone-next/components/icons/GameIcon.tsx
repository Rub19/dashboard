"use client";

import { memo } from "react";
import { Icon } from "@/lib/icons";

function ValorantIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2l12 20h-7l-5-8.5-5 8.5H0L12 2z" />
    </svg>
  );
}

const BRAND_ICONS: Record<string, string> = {
  steam: "steam",
  twitch: "twitch",
  youtube: "youtube",
  discord: "discord",
  xbox: "xbox",
  playstation: "playstation",
  nintendo: "nintendo",
  epicgames: "epicgames",
  riotgames: "riotgames",
  ubisoft: "ubisoft",
  blizzard: "blizzard",
  ea: "electronicarts",
  electronicarts: "electronicarts",
  gog: "gogdotcom",
  itchdotio: "itchdotio",
  roblox: "roblox",
};

const GENERIC_ICONS: Record<string, string> = {
  lol: "swords",
  leagueoflegends: "swords",
  tft: "swords",
  wildrift: "swords",
  runeterra: "swords",
  league: "swords",
  cs: "target",
  csgo: "target",
  counterstrike: "target",
  "counter-strike": "target",
  cstrike: "target",
  apex: "target",
  apexlegends: "target",
  pubg: "target",
  fortnite: "gamepad-2",
  callofduty: "gamepad-2",
  cod: "gamepad-2",
  gta: "gamepad-2",
  gtav: "gamepad-2",
  gtavi: "gamepad-2",
  rocketleague: "gamepad-2",
  overwatch: "eye",
  minecraft: "box",
  terraria: "box",
  steam: "gamepad-2",
};

export type GameIconProps = {
  game: string;
  className?: string;
};

function GameIconComponent({ game, className = "h-5 w-5" }: GameIconProps) {
  const key = game.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (key === "valorant") {
    return <ValorantIcon className={className} />;
  }

  const brand = BRAND_ICONS[key];
  if (brand) {
    return <Icon name={brand} pack="brand" className={className} />;
  }

  const generic = GENERIC_ICONS[key];
  if (generic) {
    return <Icon name={generic} className={className} />;
  }

  return null;
}

export const GameIcon = memo(GameIconComponent);
export default GameIcon;
