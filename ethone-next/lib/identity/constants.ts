import {
  IdentityPresenceStatus,
  IdentityRarity,
  IdentityAssetKind,
  IdentityAssetStatus,
  IdentityAvatarCategory,
} from "./types";

export const IDENTITY_PRESENCE_STATUSES: Record<
  IdentityPresenceStatus,
  { label: string; color: string; dot: string }
> = {
  online: { label: "En ligne", color: "#22c55e", dot: "bg-green-500" },
  available: { label: "Disponible", color: "#22c55e", dot: "bg-green-400" },
  busy: { label: "Occupé", color: "#eab308", dot: "bg-yellow-500" },
  dnd: { label: "Ne pas déranger", color: "#ef4444", dot: "bg-red-500" },
  away: { label: "Absent", color: "#f97316", dot: "bg-orange-400" },
  invisible: { label: "Invisible", color: "#71717a", dot: "bg-zinc-500" },
  offline: { label: "Hors ligne", color: "#3f3f46", dot: "bg-zinc-700" },
};

export const IDENTITY_RARITIES: Record<
  IdentityRarity,
  { label: string; color: string; ordinal: number }
> = {
  common: { label: "Common", color: "#a1a1aa", ordinal: 1 },
  uncommon: { label: "Uncommon", color: "#22c55e", ordinal: 2 },
  rare: { label: "Rare", color: "#3b82f6", ordinal: 3 },
  epic: { label: "Epic", color: "#a855f7", ordinal: 4 },
  legendary: { label: "Legendary", color: "#f59e0b", ordinal: 5 },
  mythic: { label: "Mythic", color: "#ec4899", ordinal: 6 },
};

export const IDENTITY_ASSET_KINDS: Record<IdentityAssetKind, string> = {
  avatar: "Avatar",
  frame: "Cadre",
  background: "Background",
  badge: "Badge",
  cosmetic: "Cosmétique",
};

export const IDENTITY_ASSET_STATUS: Record<IdentityAssetStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
  seasonal: "Saisonnier",
  limited: "Limité",
};

export const IDENTITY_AVATAR_CATEGORIES: Record<IdentityAvatarCategory, string> = {
  ethone_original: "ETHONE Original",
  human: "Human",
  anime: "Anime",
  gaming: "Gaming",
  cyberpunk: "Cyberpunk",
  sci_fi: "Sci-Fi",
  fantasy: "Fantasy",
  creatures: "Creatures",
  robots: "Robots",
  minimal: "Minimal",
};

export const DEFAULT_IDENTITY: Pick<
  import("./types").EthoneIdentity,
  | "avatar_id"
  | "avatar_frame_id"
  | "profile_background_id"
  | "badge_ids"
  | "accent_color"
  | "presence_status"
  | "bio"
> = {
  avatar_id: "",
  avatar_frame_id: "",
  profile_background_id: "",
  badge_ids: [],
  accent_color: "",
  presence_status: "offline",
  bio: "",
};
