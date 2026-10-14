"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { fetchWorker, WorkerError } from "@/lib/api";
import { sendOtp as sendOtpWorker, verifyOtp as verifyOtpWorker } from "@/lib/auth";
import { sweepLocalIdentityAndCredentials } from "@/lib/identity-sweep";
import { authLog } from "@/lib/auth-log";
import { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  isOnline: boolean;
  // null = not yet determined (still checking, or no session at all — see
  // syncMfaStatus below); true/false = a confirmed answer from the Worker.
  // BootProvider treats null like "still booting" so the dashboard never
  // flashes open before this is known one way or the other.
  mfaPending: boolean | null;
  signInOtp: (email: string, turnstileToken?: string) => Promise<{ error?: Error }>;
  verifyOtp: (
    email: string,
    code: string,
    rememberMe?: boolean
  ) => Promise<{ error?: Error }>;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  // Login-time 2FA gate (distinct from Settings → Security's setup/verify,
  // which only activates TOTP on an already-fully-authenticated session).
  // Submits exactly one of a 6-digit code or a backup code against
  // POST /api/auth/totp/challenge; on success clears mfaPending so
  // BootProvider lets the user into the app.
  verifyMfaChallenge: (input: { code?: string; backupCode?: string }) => Promise<{ error?: Error }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

const SESSION_TIMEOUT_MS = 6_000;

// Registers (or touches, if it already exists) an ethone_devices row for
// the current session, AND doubles as the login-time 2FA status check: the
// same call tells us whether this session is gated on a TOTP challenge.
// The Worker derives the device's name/platform/browser from the request's
// own User-Agent header when none is supplied, so an empty body is enough —
// see worker/src/routes/security-identity.js's deviceUpsertRoute and
// worker/src/services/device-service.js's getOrCreateDevice.
//
// Returns:
//   true/false — a confirmed pending status, read either from a successful
//     response's mfa_pending field, or (once a session is already flagged
//     pending) from the 401 MFA_REQUIRED the Worker's own per-request gate
//     throws before deviceUpsertRoute even runs — that rejection IS the
//     answer "yes, still pending", not a failure to interpret.
//   null — genuinely unknown (offline, Worker hiccup, any other error): the
//     caller must leave whatever mfaPending value it already had alone
//     rather than guessing, since this is also called on a session that
//     doesn't require 2FA at all, where failing here must never block
//     sign-in.
async function syncMfaStatus(): Promise<boolean | null> {
  try {
    const res = (await fetchWorker("/api/auth/device", { method: "POST", body: JSON.stringify({}) })) as {
      data?: { mfa_pending?: boolean };
    } | null;
    return Boolean(res?.data?.mfa_pending);
  } catch (err) {
    if (err instanceof WorkerError && err.code === "MFA_REQUIRED") return true;
    authLog("syncMfaStatus failed", err instanceof Error ? err.message : String(err));
    return null;
  }
}


export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [mfaPending, setMfaPending] = useState<boolean | null>(null);

  const resolveSession = useCallback(async () => {
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

    // A session resolved here (fresh getSession(), or restored from the
    // remember-me refresh token above) is exactly as real as one that
    // arrives via SIGNED_IN below — most commonly this is a page reload
    // while a 2FA challenge was still outstanding, which never fires
    // SIGNED_IN at all. Re-reading via getSession() (cheap, local/cached,
    // no network round trip beyond what resolveSession already did) rather
    // than threading a return value through the nested restore functions
    // above.
    const { data: resolved } = await supabase.auth.getSession();
    if (resolved.session) {
      const pending = await syncMfaStatus();
      if (pending !== null) setMfaPending(pending);
    } else {
      setMfaPending(null);
    }
  }, []);

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
          syncMfaStatus().then((pending) => {
            if (pending !== null) setMfaPending(pending);
          });
        } else if (_event === "SIGNED_OUT") {
          setMfaPending(null);
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
  }, [resolveSession]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    await resolveSession();
  }, [resolveSession]);

  // Passwordless login goes through ETHONE's own Worker OTP flow
  // (POST /api/auth/otp/send -> a real 6-digit code, delivered by the
  // branded email in worker/src/services/otp-service.js via Resend), NOT
  // Supabase's native signInWithOtp — which only ever sent its default,
  // unbranded "magic link" email with no code in it, leaving the 6-digit
  // input on the login screen impossible to fill. verifyOtp needs the
  // userId that the send step resolved, so it's stashed here between the
  // two calls.
  const otpUserIdRef = useRef<string | null>(null);

  const signInOtp = useCallback(async (email: string, turnstileToken?: string) => {
    authLog("OTP requested");
    const res = await sendOtpWorker(email, turnstileToken);
    if (!res.ok) {
      return { error: res.error instanceof Error ? res.error : new Error(String(res.error || "Impossible d'envoyer le code.")) };
    }
    otpUserIdRef.current = res.userId ?? null;
    return {};
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string, rememberMe = false) => {
    authLog("OTP verification started");
    // otpUserIdRef is in-memory only, so a page reload/discard between send
    // and verify (tab backgrounded on mobile, code opened from a different
    // tab...) can legitimately leave it null even with a fresh, valid code.
    // Pass whatever's available -- the Worker resolves it from the email
    // itself when missing, the same way sendOtp already does.
    const userId = otpUserIdRef.current;
    const res = await verifyOtpWorker(userId, email, code, rememberMe);
    if (!res.ok || !res.session) {
      authLog("OTP verification result", "error");
      return { error: res.error instanceof Error ? res.error : new Error(String(res.error || "Code invalide.")) };
    }
    authLog("OTP verification result", "success");
    setSession(res.session);
    setUser(res.session.user);
    otpUserIdRef.current = null;
    return {};
  }, []);

  const verifyMfaChallenge = useCallback(async (input: { code?: string; backupCode?: string }) => {
    try {
      await fetchWorker("/api/auth/totp/challenge", { method: "POST", body: JSON.stringify(input) });
      // The Worker already cleared mfa_pending on the device row (and its
      // own guard cache) — this just reflects that locally so BootProvider
      // lets the user into the app on its next check().
      setMfaPending(false);
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, []);

  const signOut = useCallback(async () => {
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

    sweepLocalIdentityAndCredentials(currentUserId);

    setSession(null);
    setUser(null);
    setMfaPending(null);

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
  }, [user]);

  // Memoized so the ~27 consumers of useAuth() only re-render when a field
  // they actually read changes, instead of on every AuthProvider render
  // (e.g. the isOnline listener firing) — the handler functions above are
  // themselves useCallback-stabilized so this doesn't just recompute every
  // time regardless.
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      error,
      isOnline,
      mfaPending,
      signInOtp,
      verifyOtp,
      refreshSession,
      signOut,
      verifyMfaChallenge,
    }),
    [
      session,
      user,
      loading,
      error,
      isOnline,
      mfaPending,
      signInOtp,
      verifyOtp,
      refreshSession,
      signOut,
      verifyMfaChallenge,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
