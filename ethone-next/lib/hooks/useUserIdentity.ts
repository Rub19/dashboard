"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/lib/hooks/useProfile";

export type UserIdentity = {
  displayName: string;
  avatarUrl: string | undefined;
  email: string;
  initials: string;
  isGuest: boolean;
};

/**
 * Returns true if an avatar URL is an external OAuth avatar (Google or Discord)
 * that should NOT be used for the core ETHONE profile picture.
 */
function isExternalOAuthAvatar(url?: string | null): boolean {
  if (!url || typeof url !== "string") return true;
  const lower = url.toLowerCase();
  return (
    lower.includes("googleusercontent.com") ||
    lower.includes("google.com") ||
    lower.includes("discordapp.com") ||
    lower.includes("cdn.discordapp.com") ||
    lower.includes("discord.com") ||
    lower.includes("discordapp.net")
  );
}

const GENERIC_DISPLAY_NAMES = new Set([
  "invité",
  "guest",
  "personnel",
  "personal",
  "compte",
  "utilisateur",
  "user",
  "default",
  "profil",
  "profil principal",
]);

function isGenericDisplayName(name?: unknown): boolean {
  if (!name || typeof name !== "string") return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  return GENERIC_DISPLAY_NAMES.has(trimmed.toLowerCase());
}

function firstNonGeneric(...names: Array<unknown>): string | undefined {
  for (const name of names) {
    if (!isGenericDisplayName(name)) return (name as string).trim();
  }
}

export function resolveStoredDisplayName(userId?: string | null): string {
  if (typeof window === "undefined") return "";
  const effectiveId = userId || "local";

  // 1. Try parsed identity objects (authoritative full identity)
  const identityKeys = [
    `ethone:identity:${effectiveId}`,
    "ethone:identity:current",
    "ethone:identity:local",
  ];
  for (const k of identityKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const dn = parsed.display_name || parsed.displayName;
          if (dn && !isGenericDisplayName(dn)) return String(dn).trim();
          const un = parsed.username;
          if (un && !isGenericDisplayName(un)) return String(un).trim();
        }
      }
    } catch {}
  }

  // 2. Try direct individual keys
  const directKeys = [
    userId ? `ethone_user_name:${userId}` : null,
    userId ? `ethone_user_username:${userId}` : null,
    "ethone_user_name:local",
    "ethone_user_username:local",
    "ethone:user_name",
    "ethone:user:name",
    "ethone:user:username",
    "ethone_user_name:guest",
    "ethone_active_profile_name",
  ];
  for (const k of directKeys) {
    if (!k) continue;
    try {
      const val = localStorage.getItem(k);
      if (val && !isGenericDisplayName(val)) return val.trim();
    } catch {}
  }

  // 3. Try ethone_local_profiles
  try {
    const rawProfiles = localStorage.getItem("ethone_local_profiles");
    if (rawProfiles) {
      const parsed = JSON.parse(rawProfiles);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const activeId = localStorage.getItem("ethone_active_profile_id");
        const profile = (parsed as Array<{ id?: string; display_name?: string; displayName?: string; name?: string }>).find((p) => p.id === activeId) || parsed[0];
        const name = profile?.display_name || profile?.displayName || profile?.name;
        if (name && !isGenericDisplayName(name)) return String(name).trim();
      }
    }
  } catch {}

  return "";
}

export function resolveStoredAvatar(userId?: string | null): string {
  if (typeof window === "undefined") return "";
  const effectiveId = userId || "local";

  // 1. Try parsed identity objects
  const identityKeys = [
    `ethone:identity:${effectiveId}`,
    "ethone:identity:current",
    "ethone:identity:local",
  ];
  for (const k of identityKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const av = parsed.avatar_url || parsed.avatarUrl;
          if (av && !isExternalOAuthAvatar(av)) return String(av).trim();
        }
      }
    } catch {}
  }

  // 2. Try direct individual keys
  const directKeys = [
    userId ? `ethone_custom_avatar:${userId}` : null,
    userId ? `ethone:custom:avatar:${userId}` : null,
    userId ? `ethone_user_avatar:${userId}` : null,
    "ethone_custom_avatar:local",
    "ethone:custom:avatar:local",
    "ethone_user_avatar:local",
    "ethone_custom_avatar",
    "ethone:custom:avatar",
    "ethone_user_avatar",
  ];
  for (const k of directKeys) {
    if (!k) continue;
    try {
      const val = localStorage.getItem(k);
      if (val && !isExternalOAuthAvatar(val)) return val.trim();
    } catch {}
  }

  return "";
}

export function useUserIdentity(): UserIdentity {
  const { user } = useAuth();
  const { profile: publicProfile } = useProfile();

  const userId = user?.id;
  const effectiveUserId = userId || "local";

  const [cachedName, setCachedName] = useState<string>(() => resolveStoredDisplayName(userId));
  const [cachedAvatar, setCachedAvatar] = useState<string>(() => resolveStoredAvatar(userId));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateFromStorage = (e?: Event) => {
      try {
        if (e && (e as CustomEvent).detail) {
          const d = (e as CustomEvent).detail;
          const detailName = d.display_name || d.displayName || d.username;
          if (detailName && !isGenericDisplayName(detailName)) {
            setCachedName(String(detailName).trim());
          }
          const detailAvatar = d.avatar_url || d.avatarUrl;
          if (detailAvatar && !isExternalOAuthAvatar(detailAvatar)) {
            setCachedAvatar(String(detailAvatar).trim());
          }
        }

        const name = resolveStoredDisplayName(userId);
        if (name) setCachedName(name);

        const avatar = resolveStoredAvatar(userId);
        if (avatar) setCachedAvatar(avatar);
      } catch {}
    };

    updateFromStorage();
    window.addEventListener("ethone:identity:update", updateFromStorage);
    window.addEventListener("storage", updateFromStorage);

    return () => {
      window.removeEventListener("ethone:identity:update", updateFromStorage);
      window.removeEventListener("storage", updateFromStorage);
    };
  }, [userId, user?.email]);

  const meta = useMemo(() => (user?.user_metadata || {}) as Record<string, unknown>, [user?.user_metadata]);

  const customFromMeta = firstNonGeneric(
    meta.custom_display_name,
    meta.display_name,
    meta.username,
    meta.full_name,
    meta.name
  );

  // Resolution of display name strictly isolated per user / profile
  const displayName = useMemo(() => {
    const directSaved = cachedName && !isGenericDisplayName(cachedName) ? cachedName.trim() : "";
    const publicProfName = publicProfile?.display_name && !isGenericDisplayName(publicProfile.display_name)
      ? publicProfile.display_name.trim()
      : publicProfile?.username && !isGenericDisplayName(publicProfile.username)
      ? publicProfile.username.trim()
      : "";
    const metaName = (customFromMeta as string) && !isGenericDisplayName(customFromMeta)
      ? (customFromMeta as string).trim()
      : "";
    const emailName = user?.email ? user.email.split("@")[0] : "";

    const candidate =
      directSaved ||
      publicProfName ||
      metaName ||
      emailName ||
      "Personnel";

    return candidate;
  }, [user, publicProfile?.display_name, publicProfile?.username, customFromMeta, cachedName]);

  // Resolution of avatar URL: custom user uploaded avatar on ETHONE only (strictly excluding Google & Discord avatars!)
  const candidateAvatars = [
    typeof meta.custom_avatar_url === "string" ? meta.custom_avatar_url : undefined,
    publicProfile?.avatar_url,
    typeof meta.avatar_url === "string" ? meta.avatar_url : undefined,
    cachedAvatar,
  ];

  const avatarUrl = candidateAvatars.find((url) => url && !isExternalOAuthAvatar(url)) || undefined;

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (displayName && !isGenericDisplayName(displayName)) {
          localStorage.setItem(`ethone_user_name:${effectiveUserId}`, displayName);
          localStorage.setItem(`ethone:user_name`, displayName);
        }
        if (avatarUrl && !isExternalOAuthAvatar(avatarUrl)) {
          localStorage.setItem(`ethone_custom_avatar:${effectiveUserId}`, avatarUrl);
          localStorage.setItem(`ethone_user_avatar:${effectiveUserId}`, avatarUrl);
          localStorage.setItem(`ethone_custom_avatar`, avatarUrl);
          localStorage.setItem(`ethone_user_avatar`, avatarUrl);
        }
      } catch {
        // ignore
      }
    }
  }, [effectiveUserId, displayName, avatarUrl]);

  const email = user?.email || "";

  const initials = useMemo(() => {
    if (!displayName || displayName === "Invité") return "P";
    return displayName
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "P";
  }, [displayName]);

  return {
    displayName,
    avatarUrl,
    email,
    initials,
    isGuest: !user,
  };
}

