export type IdentityPresenceStatus =
  | "online"
  | "available"
  | "busy"
  | "dnd"
  | "away"
  | "invisible"
  | "offline";

export type IdentityRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export type IdentityAssetKind =
  | "avatar"
  | "frame"
  | "background"
  | "badge"
  | "cosmetic";

export type IdentityAssetStatus =
  | "active"
  | "inactive"
  | "seasonal"
  | "limited";

export type IdentityAvatarCategory =
  | "ethone_original"
  | "human"
  | "anime"
  | "gaming"
  | "cyberpunk"
  | "sci_fi"
  | "fantasy"
  | "creatures"
  | "robots"
  | "minimal";

export type EthoneIdentity = {
  user_id: string;
  public_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  avatar_id: string;
  avatar_frame_id: string;
  profile_background_id: string;
  badge_ids: string[];
  accent_color: string;
  presence_status: IdentityPresenceStatus;
  bio: string;
  discoverable: boolean;
  updated_at: string;
};

export type IdentityAsset = {
  id: string;
  name: string;
  category: string;
  kind: IdentityAssetKind;
  rarity: IdentityRarity;
  description: string;
  tags: string[];
  asset_url: string;
  thumbnail_url: string;
  accent: string;
  status: IdentityAssetStatus;
  added_at: string;
};

export type IdentityFavorite = {
  user_id: string;
  asset_id: string;
  kind: IdentityAssetKind;
  created_at: string;
};

export type IdentityRecent = {
  user_id: string;
  asset_id: string;
  kind: IdentityAssetKind;
  used_at: string;
};
