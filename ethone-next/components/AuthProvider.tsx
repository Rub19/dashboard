"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { fetchWorker, clearCachedToken } from "@/lib/api";
import { clearFetchCache } from "@/lib/hooks/useCachedFetch";
import { authLog } from "@/lib/auth-log";
import { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  isOnline: boolean;
  signInOtp: (email: string) => Promise<{ error?: Error }>;
  verifyOtp: (
    email: string,
    code: string,
    rememberMe?: boolean,
    type?: "email" | "magiclink" | "recovery"
  ) => Promise<{ error?: Error }>;
  signInPassword: (email: string, password: string) => Promise<{ error?: Error }>;
  signInWithOAuth: (provider: "google" | "github" | "discord") => Promise<{ error?: Error; url?: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: Error; session?: Session }>;
  resetPassword: (email: string) => Promise<{ error?: Error }>;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

const SESSION_TIMEOUT_MS = 6_000;

// IndexedDB databases used for offline/local caching (see lib/cloud-cache.ts
// and lib/mail-cache.ts). Neither is scoped by user, so both must be wiped on
// sign-out or the next account on this browser can read the previous user's
// cached files/mail before its own data has loaded.
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
];

// Best-effort: register (or touch, if it already exists) an ethone_devices
// row for the session that was just signed into. The Worker derives the
// device's name/platform/browser from the request's own User-Agent header
// when none is supplied, so an empty body is enough — see
// worker/src/routes/security-identity.js's deviceUpsertRoute and
// worker/src/services/device-service.js's getOrCreateDevice. Deliberately
// swallows every failure: a user must never be blocked from signing in by
// this bookkeeping call failing (offline, Worker hiccup, etc.) — the
// consequence of a failure here is only that this one session won't show
// up in the Security Center / won't be revocable until it succeeds on a
// later request, not a broken sign-in.
async function registerCurrentDevice() {
  try {
    await fetchWorker("/api/auth/device", { method: "POST", body: JSON.stringify({}) });
  } catch (err) {
    authLog("registerCurrentDevice failed", err instanceof Error ? err.message : String(err));
  }
}

function deleteIndexedDbSafely(name: string, timeoutMs = 2000) {
  if (typeof indexedDB === "undefined") return;
  try {
    const request = indexedDB.deleteDatabase(name);
    // Fire-and-forget: if another tab/connection is holding the DB open,
    // onblocked fires but the delete stays pending. That's fine here — the
    // hard reload that follows sign-out tears down every connection anyway,
    // so we don't await this or block sign-out on it.
    const timer = setTimeout(() => {}, timeoutMs);
    request.onsuccess = () => clearTimeout(timer);
    request.onerror = () => clearTimeout(timer);
    request.onblocked = () => clearTimeout(timer);
  } catch {
    // IndexedDB unavailable (private mode, unsupported) — nothing to clean up.
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  async function resolveSession() {
    authLog("resolveSession", "start");
    let settled = false;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("La vérification de session a expiré."));
        }
      }, SESSION_TIMEOUT_MS)
    );

    async function doRestoreFromStorage() {
      // Re-read from storage: another tab may have already refreshed (and
      // rotated) the token while we were waiting on the lock below.
      const savedToken = localStorage.getItem("ethone-remember-token");
      const savedRefresh = localStorage.getItem("ethone-remember-refresh");
      const expiresAt = Number(localStorage.getItem("ethone-remember-expires") || "0");

      if (!savedToken || Date.now() >= expiresAt) {
        setSession(null);
        setUser(null);
        return;
      }

      // Already fresh enough (another tab refreshed it just now) — use it
      // directly instead of spending another refresh call on it.
      if (expiresAt - Date.now() > 60_000) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setError(null);
          return;
        }
      }

      if (savedRefresh) {
        authLog("restoreSession", "from storage");
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: savedRefresh,
        });
        if (!refreshError && refreshData.session) {
          authLog("Session restored");
          localStorage.setItem("ethone-remember-token", refreshData.session.access_token);
          localStorage.setItem("ethone-remember-refresh", refreshData.session.refresh_token);
          const newExpiresAt = refreshData.session.expires_at
            ? refreshData.session.expires_at * 1000
            : Date.now() + 3_600_000;
          localStorage.setItem("ethone-remember-expires", String(newExpiresAt));
          setSession(refreshData.session);
          setUser(refreshData.session.user);
          setError(null);
          return;
        }
      }

      setSession(null);
      setUser(null);
    }

    // Supabase refresh tokens rotate on every use: refreshing with the same
    // token twice (e.g. two tabs of the dashboard open at once, both booting
    // and independently reading the same "ethone-remember-refresh" value from
    // localStorage) makes the SECOND call fail with a 400
    // (invalid_grant/already used) — and on some GoTrue configurations that
    // failure revokes the whole token family, invalidating the session the
    // FIRST tab just successfully obtained too. That cascades into 401s on
    // every authenticated Worker call (mail, profiles, tasks, Spotify
    // now-playing, etc.) until the user manually signs out/in again.
    // A cross-tab lock serializes the refresh so only one tab actually calls
    // Supabase at a time; the rest wait, then re-read the (now rotated)
    // token from storage instead of racing with a stale one.
    async function restoreFromStorage() {
      if (typeof navigator !== "undefined" && "locks" in navigator) {
        await navigator.locks.request("ethone-supabase-refresh", { mode: "exclusive" }, doRestoreFromStorage);
      } else {
        // Browser without the Locks API: still far better than an unguarded
        // race, even though it can't coordinate across separate tabs.
        await doRestoreFromStorage();
      }
    }

    try {
      const { data } = await Promise.race([
        supabase.auth.getSession().then((res) => {
          if (!settled) {
            settled = true;
          }
          return res;
        }),
        timeout,
      ]);
      if (data.session) {
        authLog("Session detected");
        setSession(data.session);
        setUser(data.session.user);
        setError(null);
      } else if (typeof localStorage !== "undefined" && localStorage.getItem("ethone-remember-me") === "true") {
        await restoreFromStorage();
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      if (typeof localStorage !== "undefined" && localStorage.getItem("ethone-remember-me") === "true") {
        try {
          await restoreFromStorage();
        } catch (restoreErr) {
          setError(restoreErr instanceof Error ? restoreErr : new Error(String(restoreErr)));
        }
      } else {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    resolveSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        authLog("Auth state changed", _event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        // A real, revocable session needs an ethone_devices row: Phase 1's
        // per-request revocation (middleware/auth.js) and the Phase 4
        // Security Center both key off ethone_devices.session_id, matched
        // against the access token's own session_id claim (which Supabase
        // GoTrue sets on every session, not just ones the Worker mints).
        // SIGNED_IN fires for every real sign-in path — password, native
        // OTP, OAuth redirect, passkey-via-magiclink — so hooking it here
        // once covers all of them instead of duplicating the call in each
        // sign-in function. Idempotent: getOrCreateDevice reuses the
        // existing row for this session_id if one is already there, so a
        // duplicate SIGNED_IN firing (or a stray one on initial load) is
        // harmless.
        if (_event === "SIGNED_IN" && newSession) {
          registerCurrentDevice();
        }
      }
    );

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    function handleStorage(event: StorageEvent) {
      if (event.key !== "ethone-remember-token" && event.key !== "ethone-remember-me") return;
      if (!event.newValue) {
        setSession(null);
        setUser(null);
        setLoading(false);
      } else {
        resolveSession();
      }
    }

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      listener.subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, []);

  async function refreshSession() {
    setLoading(true);
    await resolveSession();
  }

  async function signInOtp(email: string) {
    authLog("OTP requested");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return { error: error ?? undefined };
  }

  async function verifyOtp(
    email: string,
    code: string,
    rememberMe = false,
    type: "email" | "magiclink" | "recovery" = "email"
  ) {
    authLog("OTP verification started");
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type,
    });
    if (data.session) {
      authLog("OTP verification result", "success");
      setSession(data.session);
      setUser(data.session.user);
      if (rememberMe) {
        localStorage.setItem("ethone-remember-me", "true");
        localStorage.setItem("ethone-remember-token", data.session.access_token);
        localStorage.setItem("ethone-remember-refresh", data.session.refresh_token);
        localStorage.setItem("ethone-remember-expires", String((data.session.expires_at ?? Date.now() / 1000 + 8 * 60 * 60) * 1000));
        localStorage.setItem("ethone-auth-type", "otp");
      } else {
        localStorage.removeItem("ethone-remember-me");
        localStorage.removeItem("ethone-remember-token");
        localStorage.removeItem("ethone-remember-refresh");
        localStorage.removeItem("ethone-remember-expires");
        localStorage.removeItem("ethone-auth-type");
      }
    }
    if (error) authLog("OTP verification result", "error");
    return { error: error ?? undefined };
  }

  async function signInPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { error: error ?? undefined };
  }

  async function signInWithOAuth(provider: "google" | "github" | "discord") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        scopes: provider === "discord" ? "identify email guilds" : undefined,
      },
    });
    return { error: error ?? undefined, url: data?.url };
  }

  async function signUp(email: string, password: string, username: string) {
    const displayName = username.trim() || email.split("@")[0];
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName } },
    });
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);

      // Seed the public profile row so the dashboard shows the real username, not a generic label.
      try {
        await supabase.from("profiles").upsert({
          id: data.session.user.id,
          username,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn("ETHONE profile seed failed:", dbErr);
      }
    }
    return { error: error ?? undefined, session: data.session ?? undefined };
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password/` : undefined,
    });
    return { error: error ?? undefined };
  }

  async function signOut() {
    const currentUserId = user?.id;

    // Best-effort server-side revoke. Swallowed: the Worker being unreachable
    // must not stop the local cleanup below.
    try {
      await fetchWorker("/api/signout", { method: "POST" });
    } catch {
      // On continue la déconnexion locale même si le Worker est injoignable.
    }

    // Best-effort Supabase sign-out. This must be wrapped: if it throws
    // (e.g. offline), everything below — the cache/localStorage/IndexedDB
    // cleanup and the hard reload — still has to run unconditionally, or a
    // previous identity's data and subscriptions can keep leaking into
    // whoever signs in next on this browser.
    try {
      await supabase.auth.signOut();
    } catch (err) {
      authLog("supabase.auth.signOut failed", err instanceof Error ? err.message : String(err));
    }

    // Drop the module-level bearer token cache immediately (lib/api.ts can
    // otherwise keep serving this token to Worker calls for up to 60s).
    try {
      clearCachedToken();
    } catch {}

    // Drop the shared fetchWorker response cache (useCachedFetch.ts) so the
    // next signed-in user never reads a GET response cached under this user.
    try {
      clearFetchCache();
    } catch {}

    if (typeof window !== "undefined") {
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
        if (currentUserId) {
          localStorage.removeItem(`ethone_user_name:${currentUserId}`);
          localStorage.removeItem(`ethone_user_avatar:${currentUserId}`);
          localStorage.removeItem(`ethone_custom_avatar:${currentUserId}`);
          localStorage.removeItem(`ethone:custom:avatar:${currentUserId}`);
        }
        window.dispatchEvent(new CustomEvent("ethone:identity:update"));
      } catch {}

      // Unscoped IndexedDB caches (cloud files, mail) — never keyed by user,
      // so they must be dropped here too. Fire-and-forget: see
      // deleteIndexedDbSafely, the hard reload below covers the rest.
      for (const dbName of INDEXEDDB_DATABASES) {
        deleteIndexedDbSafely(dbName);
      }
    }

    setSession(null);
    setUser(null);

    // Hard reload — not a client-side route push. This is the primary fix:
    // a fresh page load cannot have any stale closure (realtime
    // subscription, in-memory cache, etc.) still holding the previous
    // identity, which a same-page state clear alone cannot guarantee.
    if (typeof window !== "undefined") {
      try {
        window.location.href = "/login";
      } catch {
        // Navigation API unavailable (e.g. non-browser test environment) —
        // local state is already cleared above, nothing else to do.
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        error,
        isOnline,
        signInOtp,
        verifyOtp,
        signInPassword,
        signInWithOAuth,
        signUp,
        resetPassword,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
