"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { fetchWorker } from "@/lib/api";
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
  signInWithOAuth: (provider: "google" | "github") => Promise<{ error?: Error; url?: string | null }>;
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

    async function restoreFromStorage() {
      const savedToken = localStorage.getItem("ethone-remember-token");
      const savedRefresh = localStorage.getItem("ethone-remember-refresh");
      const expiresAt = Number(localStorage.getItem("ethone-remember-expires") || "0");

      if (!savedToken || Date.now() >= expiresAt) {
        setSession(null);
        setUser(null);
        return;
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
          setSession(refreshData.session);
          setUser(refreshData.session.user);
          setError(null);
          return;
        }
      }

      setSession(null);
      setUser(null);
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

  async function signInWithOAuth(provider: "google" | "github") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
      },
    });
    return { error: error ?? undefined, url: data?.url };
  }

  async function signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
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
    try {
      await fetchWorker("/api/signout", { method: "POST" });
    } catch {
      // On continue la déconnexion locale même si le Worker est injoignable.
    }
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ethone-remember-me");
        localStorage.removeItem("ethone-remember-token");
        localStorage.removeItem("ethone-remember-refresh");
        localStorage.removeItem("ethone-remember-expires");
        localStorage.removeItem("ethone-auth-type");
        localStorage.removeItem("ethone_user_name");
        localStorage.removeItem("ethone_user_avatar");
        localStorage.removeItem("ethone_custom_avatar");
        localStorage.removeItem("ethone:custom:avatar");
        if (currentUserId) {
          localStorage.removeItem(`ethone_user_name:${currentUserId}`);
          localStorage.removeItem(`ethone_user_avatar:${currentUserId}`);
          localStorage.removeItem(`ethone_custom_avatar:${currentUserId}`);
          localStorage.removeItem(`ethone:custom:avatar:${currentUserId}`);
        }
        window.dispatchEvent(new CustomEvent("ethone:identity:update"));
      } catch {}
    }
    setSession(null);
    setUser(null);
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
