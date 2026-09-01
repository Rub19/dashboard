"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
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
  "profil principal",
  "profil",
  "default",
  "invité",
  "utilisateur",
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

export function useUserIdentity(): UserIdentity {
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();

  const [cachedName, setCachedName] = useState<string>("");
  const [cachedAvatar, setCachedAvatar] = useState<string>("");

  const userId = user?.id;
  const effectiveUserId = userId || "local";

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const updateFromStorage = () => {
          const savedName =
            (userId ? localStorage.getItem(`ethone_user_name:${userId}`) : null) ||
            localStorage.getItem(`ethone_user_name:local`) ||
            localStorage.getItem(`ethone_user_name:guest`) ||
            localStorage.getItem(`ethone:user_name`) ||
            localStorage.getItem(`ethone:user:name`);

          const savedAvatar =
            (userId
              ? localStorage.getItem(`ethone_custom_avatar:${userId}`) ||
                localStorage.getItem(`ethone:custom:avatar:${userId}`) ||
                localStorage.getItem(`ethone_user_avatar:${userId}`)
              : null) ||
            localStorage.getItem(`ethone_custom_avatar:local`) ||
            localStorage.getItem(`ethone:custom:avatar:local`) ||
            localStorage.getItem(`ethone_user_avatar:local`) ||
            localStorage.getItem(`ethone_custom_avatar`) ||
            localStorage.getItem(`ethone:custom:avatar`) ||
            localStorage.getItem(`ethone_user_avatar`);

          if (savedName && savedName.trim() && savedName !== "Invité" && !isGenericDisplayName(savedName)) {
            setCachedName(savedName.trim());
          } else {
            setCachedName("");
          }

          if (savedAvatar) {
            if (isExternalOAuthAvatar(savedAvatar)) {
              setCachedAvatar("");
            } else {
              setCachedAvatar(savedAvatar);
            }
          } else {
            setCachedAvatar("");
          }
        };

        updateFromStorage();
        window.addEventListener("ethone:identity:update", updateFromStorage);
        window.addEventListener("storage", updateFromStorage);

        return () => {
          window.removeEventListener("ethone:identity:update", updateFromStorage);
          window.removeEventListener("storage", updateFromStorage);
        };
      } catch {
        // ignore storage restrictions
      }
    }
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
    const activeProfName = firstNonGeneric(activeProfile?.name);
    const publicProfName = firstNonGeneric(publicProfile?.display_name, publicProfile?.username);
    const emailName = user?.email ? user.email.split("@")[0] : "";

    if (!user) {
      return activeProfName || cachedName || publicProfName || "Invité";
    }

    return (
      publicProfName ||
      activeProfName ||
      customFromMeta ||
      cachedName ||
      emailName ||
      "Utilisateur"
    );
  }, [user, publicProfile?.display_name, publicProfile?.username, activeProfile?.name, customFromMeta, cachedName]);

  // Resolution of avatar URL: custom user uploaded avatar on ETHONE only (strictly excluding Google & Discord avatars!)
  const candidateAvatars = [
    typeof meta.custom_avatar_url === "string" ? meta.custom_avatar_url : undefined,
    publicProfile?.avatar_url,
    (activeProfile as unknown as { avatar_url?: string; avatar?: string })?.avatar_url,
    (activeProfile as unknown as { avatar_url?: string; avatar?: string })?.avatar,
    typeof meta.avatar_url === "string" ? meta.avatar_url : undefined,
    cachedAvatar,
  ];

  const avatarUrl = candidateAvatars.find((url) => url && !isExternalOAuthAvatar(url)) || undefined;

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (displayName && displayName !== "Invité" && displayName !== "Utilisateur") {
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

