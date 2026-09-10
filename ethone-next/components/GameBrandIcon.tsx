"use client";

import { memo } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

type GameBrandIconProps = {
  name?: string;
  iconUrl?: string;
  className?: string;
};

// Real brand marks (Simple Icons). Keyed by a lowercase substring of the
// Discord activity name. Order matters — more specific first.
const BRANDS: { match: string; icon: string; color: string }[] = [
  { match: "valorant", icon: "simple-icons:valorant", color: "#FF4655" },
  { match: "league of legends", icon: "simple-icons:leagueoflegends", color: "#C89B3C" },
  { match: "teamfight tactics", icon: "simple-icons:leagueoflegends", color: "#C89B3C" },
  { match: "counter-strike", icon: "simple-icons:counterstrike", color: "#F7A800" },
  { match: "cs2", icon: "simple-icons:counterstrike", color: "#F7A800" },
  { match: "cs:go", icon: "simple-icons:counterstrike", color: "#F7A800" },
  { match: "dota", icon: "simple-icons:dota2", color: "#E03A3E" },
  { match: "minecraft", icon: "simple-icons:minecraft", color: "#62B47A" },
  { match: "roblox", icon: "simple-icons:roblox", color: "#E2231A" },
  { match: "fortnite", icon: "simple-icons:fortnite", color: "#9D4DFF" },
  { match: "grand theft auto", icon: "simple-icons:rockstargames", color: "#FCAF17" },
  { match: "gta", icon: "simple-icons:rockstargames", color: "#FCAF17" },
  { match: "fivem", icon: "simple-icons:fivem", color: "#F40552" },
  { match: "rockstar", icon: "simple-icons:rockstargames", color: "#FCAF17" },
  { match: "fifa", icon: "simple-icons:fifa", color: "#326295" },
  { match: "ea sports fc", icon: "simple-icons:ea", color: "#FF4747" },
  { match: "ea ", icon: "simple-icons:ea", color: "#FF4747" },
  { match: "epic games", icon: "simple-icons:epicgames", color: "#FFFFFF" },
  { match: "steam", icon: "simple-icons:steam", color: "#66C0F4" },
];

export const GameBrandIcon = memo(function GameBrandIcon({
  name = "",
  iconUrl,
  className = "h-5 w-5",
}: GameBrandIconProps) {
  // 1. The game's own icon from Discord Rich Presence — always the most accurate.
  if (iconUrl && iconUrl.startsWith("http")) {
    return (
      <img
        src={iconUrl}
        alt={name}
        className={cn("rounded-md object-contain shrink-0", className)}
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    );
  }

  // 2. A known brand mark.
  const clean = name.toLowerCase().trim();
  const brand = BRANDS.find((b) => clean.includes(b.match));
  if (brand) {
    return (
      <IconifyIcon
        icon={brand.icon}
        className={cn("shrink-0", className)}
        style={{ color: brand.color }}
        aria-hidden="true"
      />
    );
  }

  // 3. Generic.
  return <Gamepad2 className={cn("text-violet-400 shrink-0", className)} />;
});

export default GameBrandIcon;
