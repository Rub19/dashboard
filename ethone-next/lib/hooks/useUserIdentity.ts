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
        const savedAvatar = localStorage.getItem("ethone_user_avatar");
        if (savedName) setCachedName(savedName);
        if (savedAvatar) setCachedAvatar(savedAvatar);
      } catch {
        // ignore storage restrictions
      }
    }
  }, []);

  const meta = useMemo(() => (user?.user_metadata || {}) as Record<string, unknown>, [user?.user_metadata]);

  const fromMeta =
    (typeof meta.full_name === "string" ? meta.full_name : undefined) ||
    (typeof meta.name === "string" ? meta.name : undefined) ||
    (typeof meta.username === "string" ? meta.username : undefined) ||
    (typeof meta.user_name === "string" ? meta.user_name : undefined) ||
    (typeof meta.preferred_username === "string" ? meta.preferred_username : undefined);

  // Resolution of display name with priority on explicitly chosen profile/display_name
  const displayName =
    publicProfile?.display_name ||
    publicProfile?.username ||
    activeProfile?.name ||
    fromMeta ||
    cachedName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Rub";

  // Resolution of avatar URL with priority on custom avatar, Google OAuth avatar, or active profile
  const avatarUrl =
    publicProfile?.avatar_url ||
    (typeof meta.avatar_url === "string" ? meta.avatar_url : undefined) ||
    (typeof meta.picture === "string" ? meta.picture : undefined) ||
    (typeof meta.avatar === "string" ? meta.avatar : undefined) ||
    (activeProfile as unknown as { avatar_url?: string; avatar?: string })?.avatar_url ||
    (activeProfile as unknown as { avatar_url?: string; avatar?: string })?.avatar ||
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
