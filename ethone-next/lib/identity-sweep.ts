import { clearCachedToken } from "./api";
import { clearFetchCache } from "./hooks/useCachedFetch";

const INDEXEDDB_DATABASES = ["ethone-cloud", "ethone-mail-cache"];

// Exact, non-namespaced localStorage keys that must never survive a sign-out
// because they either hold session material or leak identity/credentials
// across accounts on the same browser.
const SIGNOUT_EXACT_KEYS = [
  "ethone-remember-me",
  "ethone-remember-token",
  "ethone-remember-refresh",
  "ethone-remember-expires",
  "ethone-auth-type",
  "ethone_user_name",
  "ethone_user_avatar",
  "ethone_custom_avatar",
  "ethone:custom:avatar",
  // Bare, non-namespaced credential keys read/injected by lib/api.ts and
  // various provider integrations.
  "discord_token",
  "github_token",
  "spotify_access_token",
  "spotify_refresh_token",
  "RIOT_API_KEY",
  "HENRIK_API_KEY",
  // lib/identity/useIdentity.ts writes these bare/mis-namespaced keys
  // alongside the properly `:${userId}`-scoped ones below (which the
  // SIGNOUT_KEY_PREFIXES sweep below now also catches via "ethone:identity:"
  // and "ethone:user:"). These specific ones use a different separator or no
  // scoping at all and were silently missed by the old list, letting one
  // account's display name/avatar/bio leak into the next account signed in
  // on the same browser.
  "ethone:user_name",
  "ethone_user_name:local",
  "ethone_user_username:local",
  "ethone_user_bio:local",
  "ethone_user_frame:local",
  "ethone_custom_avatar:local",
  // components/AvatarPickerModal.tsx writes these with no user scoping at all.
  "ethone_user_frame",
  "ethone_user_bg",
  "ethone_user_badge",
  // components/DashboardOverview.tsx's pinned/favorite/configured widgets —
  // pure local UI preference with no cloud backing, but still leaks the
  // previous account's dashboard customization into the next one.
  "ethone-pinned-widgets",
  "ethone-favorite-widgets",
  "ethone-widget-configs",
];

// Prefixes for localStorage keys that are namespaced by guild/provider id
// (not by ETHONE user id) and therefore leak the previous user's Discord
// servers, automation config, and provider credentials into the next signed
// in user unless swept on sign-out. This mirrors the bundle
// IntegrationsSettings.tsx already clears when a user manually disconnects a
// single provider (connected/token/refresh_token/clientId/pub/cred), applied
// here to every provider at once.
const SIGNOUT_KEY_PREFIXES = [
  "ethone:discord:", // guilds, profile, userId, settings:{guildId}
  "ethone:automod:", // cfg:{guildId}, rules:{guildId}
  "ethone:anti-raid:", // {guildId}
  "ethone:forms:", // {guildId}
  "ethone:cred:", // per-provider credentials (riot, spotify, ai:*, ...)
  "ethone:token:", // per-provider access tokens
  "ethone:refresh_token:", // per-provider refresh tokens
  "ethone:connected:", // per-provider "connected" flags
  "ethone:clientId:", // per-provider OAuth client ids
  "ethone:pub:", // public provider identifiers (e.g. Discord lanyard user id)
  "ethone:oauth:", // transient OAuth/PKCE verifier state
  // lib/identity/useIdentity.ts's local identity cache: the bare
  // "ethone:identity:current" blob (checked before any per-user key or the
  // fresh Supabase profile — the actual leak vector) AND every
  // "ethone:identity:${userId}" variant, for whichever user id it was last
  // written under, not just the current one.
  "ethone:identity:",
  // lib/identity/useIdentity.ts also writes ethone:user:username,
  // ethone:user:bio, ethone:user:frame — no per-user scoping.
  "ethone:user:",
];

function deleteIndexedDbSafely(name: string, timeoutMs = 2000) {
  if (typeof indexedDB === "undefined") return;
  try {
    const request = indexedDB.deleteDatabase(name);
    // Fire-and-forget: if another tab/connection is holding the DB open,
    // onblocked fires but the delete stays pending. That's fine here — the
    // hard reload that follows sign-out (or the fresh session a brand-new
    // signup starts) tears down every connection anyway, so we don't await
    // this or block on it.
    const timer = setTimeout(() => {}, timeoutMs);
    request.onsuccess = () => clearTimeout(timer);
    request.onerror = () => clearTimeout(timer);
    request.onblocked = () => clearTimeout(timer);
  } catch {
    // IndexedDB unavailable (private mode, unsupported) — nothing to clean up.
  }
}

// Sweeps every local cache that must never survive a sign-out or leak into a
// newly created account on the same browser: the module-level bearer-token
// and fetchWorkerCached caches, every localStorage key matching
// SIGNOUT_EXACT_KEYS/SIGNOUT_KEY_PREFIXES (identity, provider credentials,
// OAuth tokens, dashboard customization — see the comments on those lists),
// the outgoing user's `:${userId}`-suffixed identity keys, and the unscoped
// IndexedDB caches. Called from AuthProvider's signOut() (the normal path)
// AND from the start of signUpWithPassword() in this file — a browser can
// reach the register form with a stale, never-signed-out session's
// localStorage still present, and that must not leak into the brand-new
// account either.
export function sweepLocalIdentityAndCredentials(outgoingUserId?: string) {
  try {
    clearCachedToken();
  } catch {}
  try {
    clearFetchCache();
  } catch {}

  if (typeof window === "undefined") return;

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        SIGNOUT_EXACT_KEYS.includes(key) ||
        SIGNOUT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
      ) {
        localStorage.removeItem(key);
      }
    }
    if (outgoingUserId) {
      localStorage.removeItem(`ethone_user_name:${outgoingUserId}`);
      localStorage.removeItem(`ethone_user_avatar:${outgoingUserId}`);
      localStorage.removeItem(`ethone_custom_avatar:${outgoingUserId}`);
      localStorage.removeItem(`ethone:custom:avatar:${outgoingUserId}`);
    }
    window.dispatchEvent(new CustomEvent("ethone:identity:update"));
  } catch {}

  // Unscoped IndexedDB caches (cloud files, mail) — never keyed by user, so
  // they must be dropped here too. Fire-and-forget: see
  // deleteIndexedDbSafely.
  for (const dbName of INDEXEDDB_DATABASES) {
    deleteIndexedDbSafely(dbName);
  }
}
