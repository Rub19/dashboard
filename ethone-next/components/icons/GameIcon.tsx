"use client";

import { memo } from "react";
import { Icon } from "@/lib/icons";

export function ValorantIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M23.792 2.152a.25.25 0 0 0-.098.083q-5.077 6.345-10.15 12.69c-.107.093-.025.288.119.265c2.439.003 4.877 0 7.316.001a.66.66 0 0 0 .552-.25l2.324-2.903a.72.72 0 0 0 .144-.49c-.002-3.077 0-6.153-.003-9.23c.016-.11-.1-.206-.204-.167zM.077 2.166c-.077.038-.074.132-.076.205q.002 4.612.001 9.225a.68.68 0 0 0 .158.463l7.64 9.55c.12.152.308.25.505.247c2.455 0 4.91.003 7.365 0c.142.02.222-.174.116-.265C10.661 15.176 5.526 8.766.4 2.35c-.08-.094-.174-.272-.322-.184z" />
    </svg>
  );
}

export function LeagueOfLegendsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="m1.912 0l1.212 2.474v19.053L1.912 24h14.73l1.337-4.682H8.33V0ZM12 1.516c-.913 0-1.798.112-2.648.312v1.74A9.7 9.7 0 0 1 12 3.2c5.267 0 9.536 4.184 9.536 9.348a9.2 9.2 0 0 1-2.3 6.086l-.273.954l-.602 2.112c2.952-1.993 4.89-5.335 4.89-9.122C23.25 6.468 18.213 1.516 12 1.516m0 2.673c-.924 0-1.814.148-2.648.414v13.713h8.817a8.25 8.25 0 0 0 2.36-5.768c0-4.617-3.818-8.359-8.529-8.359M2.104 7.312A10.86 10.86 0 0 0 .75 12.576c0 1.906.492 3.7 1.355 5.266z" />
    </svg>
  );
}

const BRAND_ICONS: Record<string, string> = {
  valorant: "valorant",
  lol: "leagueoflegends",
  leagueoflegends: "leagueoflegends",
  league: "leagueoflegends",
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
  tft: "swords",
  wildrift: "swords",
  runeterra: "swords",
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

  if (key === "lol" || key === "leagueoflegends" || key === "league") {
    return <LeagueOfLegendsIcon className={className} />;
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
