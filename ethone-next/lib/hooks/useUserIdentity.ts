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

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const updateFromStorage = () => {
          const savedName = localStorage.getItem("ethone_user_name");
          const savedAvatar =
            localStorage.getItem("ethone_custom_avatar") ||
            localStorage.getItem("ethone:custom:avatar") ||
            localStorage.getItem("ethone_user_avatar");

          if (savedName && savedName !== "Rubens Lespinasse") {
            setCachedName(savedName);
          } else if (savedName === "Rubens Lespinasse") {
            localStorage.setItem("ethone_user_name", "Rub");
            setCachedName("Rub");
          }

          if (savedAvatar) {
            if (isExternalOAuthAvatar(savedAvatar)) {
              localStorage.removeItem("ethone_user_avatar");
              localStorage.removeItem("ethone_custom_avatar");
              localStorage.removeItem("ethone:custom:avatar");
              setCachedAvatar("");
            } else {
              setCachedAvatar(savedAvatar);
            }
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
  }, []);

  const meta = useMemo(() => (user?.user_metadata || {}) as Record<string, unknown>, [user?.user_metadata]);

  const customFromMeta =
    (typeof meta.custom_display_name === "string" ? meta.custom_display_name : undefined) ||
    (typeof meta.display_name === "string" ? meta.display_name : undefined) ||
    (typeof meta.username === "string" ? meta.username : undefined);

  // Resolution of display name with priority on explicitly chosen profile/display_name ("Rub")
  const displayName =
    publicProfile?.display_name ||
    publicProfile?.username ||
    activeProfile?.name ||
    customFromMeta ||
    cachedName ||
    (user?.email && (user.email.startsWith("rub19") || user.email.startsWith("rub")) ? "Rub" : undefined) ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Rub";

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
        if (displayName && displayName !== "Invité" && displayName !== "Utilisateur ETHONE") {
          localStorage.setItem("ethone_user_name", displayName);
        }
        if (avatarUrl && !isExternalOAuthAvatar(avatarUrl)) {
          localStorage.setItem("ethone_user_avatar", avatarUrl);
          localStorage.setItem("ethone_custom_avatar", avatarUrl);
        }
      } catch {
        // ignore
      }
    }
  }, [displayName, avatarUrl]);

  const email = user?.email || "";

  const initials = useMemo(() => {
    if (!displayName) return "R";
    return displayName
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [displayName]);

  return {
    displayName,
    avatarUrl,
    email,
    initials,
    isGuest: !user,
  };
}

