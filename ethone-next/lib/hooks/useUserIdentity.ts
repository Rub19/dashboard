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

export function useUserIdentity(): UserIdentity {
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();

  const [cachedName, setCachedName] = useState<string>("");
  const [cachedAvatar, setCachedAvatar] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedName = localStorage.getItem("ethone_user_name");
        const savedAvatar = localStorage.getItem("ethone_user_avatar") || localStorage.getItem("ethone_custom_avatar");
        // Clear old auto-imported Google full name
        if (savedName && savedName !== "Rubens Lespinasse") {
          setCachedName(savedName);
        } else if (savedName === "Rubens Lespinasse") {
          localStorage.setItem("ethone_user_name", "Rub");
          setCachedName("Rub");
        }
        if (savedAvatar) {
          setCachedAvatar(savedAvatar);
        }
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

  // Resolution of avatar URL: custom user uploaded avatar or profile avatar or OAuth avatar
  const avatarUrl =
    publicProfile?.avatar_url ||
    (activeProfile as unknown as { avatar_url?: string; avatar?: string })?.avatar_url ||
    (activeProfile as unknown as { avatar_url?: string; avatar?: string })?.avatar ||
    (typeof meta.custom_avatar_url === "string" ? meta.custom_avatar_url : undefined) ||
    (typeof meta.avatar_url === "string" ? meta.avatar_url : undefined) ||
    (typeof meta.picture === "string" ? meta.picture : undefined) ||
    cachedAvatar ||
    undefined;

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (displayName && displayName !== "Invité" && displayName !== "Utilisateur ETHONE") {
          localStorage.setItem("ethone_user_name", displayName);
        }
        if (avatarUrl) {
          localStorage.setItem("ethone_user_avatar", avatarUrl);
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
