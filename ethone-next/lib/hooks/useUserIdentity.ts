"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useAccountProfile } from "@/lib/profile/account-profile";

export type UserIdentity = {
  displayName: string;
  username: string;
  avatarUrl: string | undefined;
  email: string;
  initials: string;
  isGuest: boolean;
  bio?: string;
  status?: string;
  verified?: boolean;
};

/** Les avatars Google / Discord du fournisseur de connexion ne servent pas de photo de profil ETHONE. */
function isExternalOAuthAvatar(url?: string | null): boolean {
  if (!url || typeof url !== "string") return true;
  return /googleusercontent\.com|google\.com|discordapp\.(com|net)|discord\.com/i.test(url);
}

const GENERIC_DISPLAY_NAMES = new Set(["invité", "guest", "personnel", "personal", "compte", "utilisateur", "user", "default", "profil", "profil principal"]);

function firstNonGeneric(...names: unknown[]): string | undefined {
  for (const name of names) {
    if (typeof name === "string" && name.trim() && !GENERIC_DISPLAY_NAMES.has(name.trim().toLowerCase())) return name.trim();
  }
}

/**
 * Identité affichée partout (barre latérale, menu, tableau de bord…). Elle vient du profil du compte, synchronisé en
 * direct entre appareils (lib/profile/account-profile) ; les métadonnées du compte servent seulement tant que le profil
 * n'a jamais été enregistré.
 */
export function useUserIdentity(): UserIdentity {
  const { user } = useAuth();
  const { profile } = useAccountProfile();
  const meta = (user?.user_metadata || {}) as Record<string, unknown>;
  const emailName = user?.email ? user.email.split("@")[0] : "";

  const displayName =
    firstNonGeneric(profile.displayName, meta.custom_display_name, meta.display_name, meta.full_name, meta.name, profile.username, meta.username) ||
    emailName ||
    "Personnel";
  const username = (firstNonGeneric(profile.username, meta.username, meta.user_name, meta.preferred_username) || emailName || "utilisateur").replace(/^@+/, "");
  const avatarUrl = [profile.avatarUrl, meta.custom_avatar_url, meta.avatar_url].find(
    (u): u is string => typeof u === "string" && !isExternalOAuthAvatar(u),
  );

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase() || "P";
  }, [displayName]);

  return {
    displayName,
    username,
    avatarUrl,
    email: user?.email || "",
    initials,
    isGuest: !user,
    bio: profile.bio,
    status: profile.presence,
    verified: Boolean(user?.email_confirmed_at),
  };
}
