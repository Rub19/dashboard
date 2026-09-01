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

export function useUserIdentity(): UserIdentity {
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();

  const [cachedName, setCachedName] = useState<string>("");
  const [cachedAvatar, setCachedAvatar] = useState<string>("");

  const userId = user?.id;

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const updateFromStorage = () => {
          if (!userId) {
            setCachedName("");
            setCachedAvatar("");
            return;
          }

          const savedName =
            localStorage.getItem(`ethone_user_name:${userId}`) ||
            (user?.email && user.email.includes("rub") ? localStorage.getItem("ethone_user_name") : null);

          const savedAvatar =
            localStorage.getItem(`ethone_custom_avatar:${userId}`) ||
            localStorage.getItem(`ethone:custom:avatar:${userId}`) ||
            (user?.email && user.email.includes("rub")
              ? localStorage.getItem("ethone_custom_avatar") || localStorage.getItem("ethone:custom:avatar")
              : null);

          if (savedName) {
            setCachedName(savedName);
          } else {
            setCachedName("");
          }

          if (savedAvatar) {
            if (isExternalOAuthAvatar(savedAvatar)) {
              localStorage.removeItem(`ethone_custom_avatar:${userId}`);
              localStorage.removeItem(`ethone:custom:avatar:${userId}`);
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

  const customFromMeta =
    (typeof meta.custom_display_name === "string" && meta.custom_display_name.trim() ? meta.custom_display_name.trim() : undefined) ||
    (typeof meta.display_name === "string" && meta.display_name.trim() ? meta.display_name.trim() : undefined) ||
    (typeof meta.username === "string" && meta.username.trim() ? meta.username.trim() : undefined) ||
    (typeof meta.full_name === "string" && meta.full_name.trim() ? meta.full_name.trim() : undefined) ||
    (typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : undefined);

  // Resolution of display name strictly isolated per user
  const displayName = useMemo(() => {
    if (!user) return "Invité";

    return (
      (publicProfile?.display_name && publicProfile.display_name.trim()) ||
      (publicProfile?.username && publicProfile.username.trim()) ||
      (activeProfile?.name && activeProfile.name.trim() !== "Default" && activeProfile.name.trim()) ||
      customFromMeta ||
      cachedName ||
      (user?.email ? user.email.split("@")[0] : "") ||
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
    if (typeof window !== "undefined" && userId) {
      try {
        if (displayName && displayName !== "Invité" && displayName !== "Utilisateur") {
          localStorage.setItem(`ethone_user_name:${userId}`, displayName);
        }
        if (avatarUrl && !isExternalOAuthAvatar(avatarUrl)) {
          localStorage.setItem(`ethone_custom_avatar:${userId}`, avatarUrl);
          localStorage.setItem(`ethone_user_avatar:${userId}`, avatarUrl);
        }
      } catch {
        // ignore
      }
    }
  }, [userId, displayName, avatarUrl]);

  const email = user?.email || "";

  const initials = useMemo(() => {
    if (!displayName || displayName === "Invité") return "I";
    return displayName
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  }, [displayName]);

  return {
    displayName,
    avatarUrl,
    email,
    initials,
    isGuest: !user,
  };
}

