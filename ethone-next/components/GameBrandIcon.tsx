"use client";

import { memo } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { Gamepad2, Target, Swords, Dice5 } from "@/components/icons/ph";
import { cn } from "@/lib/utils";

type GameBrandIconProps = {
  name?: string;
  iconUrl?: string;
  className?: string;
};

const BRANDS: { match: string; icon: string; color: string }[] = [
  { match: "apex legends", icon: "arcticons:apex-legends", color: "#DA0000" },
  { match: "the finals", icon: "simple-icons:thefinals", color: "#FFDE00" },
  { match: "rainbow six siege", icon: "arcticons:guide-for-rainbow-six-siege", color: "#E8A33D" },
  { match: "destiny 2", icon: "arcticons:destiny-2", color: "#C9A227" },
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

  const clean = name.toLowerCase().trim();

  if (clean.includes("valorant")) {
    return (
      <Target
        className={cn("shrink-0 text-rose-500", className)}
        style={{ color: "#FF4655" }}
        aria-hidden="true"
      />
    );
  }

  if (clean.includes("league of legends") || clean === "lol") {
    return (
      <Swords
        className={cn("shrink-0 text-amber-400", className)}
        style={{ color: "#C89B3C" }}
        aria-hidden="true"
      />
    );
  }

  if (clean.includes("teamfight tactics") || clean === "tft") {
    return (
      <Dice5
        className={cn("shrink-0 text-purple-400", className)}
        style={{ color: "#A855F7" }}
        aria-hidden="true"
      />
    );
  }

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

  return <Gamepad2 className={cn("text-violet-400 shrink-0", className)} />;
});

export default GameBrandIcon;
