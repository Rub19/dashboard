"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import Loading from "@/components/Loading";
import BrandMark from "@/components/BrandMark";
import Shell from "@/components/Shell";
import { motion } from "framer-motion";

export type BootState =
  | "booting"
  | "ready"
  | "authenticated"
  | "unauthenticated"
  | "error"
  | "offline"
  | "recovering";

type BootContextValue = {
  state: BootState;
  retry: () => void;
  continueOffline: () => void;
};

const BootContext = createContext<BootContextValue>({
  state: "booting",
  retry: () => {},
  continueOffline: () => {},
});

export function useBoot() {
  return useContext(BootContext);
}

const PUBLIC_ROUTES = ["/login", "/password-recovery", "/reset-password"];

const BOOT_TIMEOUT_MS = 8_000;
const BOOT_MIN_DURATION_MS = 600;
const SEGMENT_1 = 150;
const SEGMENT_2 = 300;
const SEGMENT_3 = 450;

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function resolvePublicRoute(pathname: string | null): boolean {
  if (pathname) return isPublicRoute(pathname);
  if (typeof window !== "undefined") return isPublicRoute(window.location.pathname);
  return true;
}

export default function BootProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading, error: authError, refreshSession } = useAuth();
  const { loaded: profileLoaded } = useActiveProfile();
  const pathname = usePathname();
  const router = useRouter();

  const [state, setState] = useState<BootState>(() => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      return "offline";
    }
    return resolvePublicRoute(pathname) ? "unauthenticated" : "booting";
  });

  const [error, setError] = useState<string | null>(null);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootReady, setBootReady] = useState(false);
  const bootReadyRef = useRef(false);
  const bootStartRef = useRef<number | null>(null);
  const donationReturnRef = useRef(false);

  const publicRoute = resolvePublicRoute(pathname);

  useEffect(() => {
    bootReadyRef.current = bootReady;
  }, [bootReady]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      donationReturnRef.current = new URLSearchParams(window.location.search).get("supported") === "true";
    }
  }, []);

  const check = useCallback(() => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setState("offline");
      return;
    }

    if (authLoading) {
      setState(publicRoute ? "unauthenticated" : "booting");
      return;
    }

    if (authError) {
      setState("error");
      setError(authError.message || "Erreur lors du démarrage d'ETHONE.");
      return;
    }

    if (session) {
      if (!profileLoaded) {
        setState("booting");
        return;
      }
      setState("authenticated");
      if (publicRoute) {
        setState("recovering");
        router.replace("/");
      }
    } else {
      setState("ready");
    }
  }, [authLoading, authError, session, profileLoaded, publicRoute, router]);

  const retry = useCallback(() => {
    setError(null);
    setState("booting");
    setBootReady(false);
    setBootProgress(0);
    bootStartRef.current = null;
    refreshSession();
  }, [refreshSession]);

  const continueOffline = useCallback(() => {
    setState("ready");
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      if (state === "offline") {
        retry();
      }
    };
    const handleOffline = () => setState("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [state, retry]);

  useEffect(() => {
    if (state !== "booting") return;
    const timeout = setTimeout(() => {
      setState("error");
      setError("Le démarrage d'ETHONE a pris trop de temps.");
    }, BOOT_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [state]);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (publicRoute) {
      setBootProgress(100);
      setBootReady(true);
      return;
    }
    if (state === "error" || state === "offline") {
      setBootProgress(100);
      setBootReady(true);
      return;
    }

    bootStartRef.current = bootStartRef.current ?? Date.now();
    let raf = 0;

    const tick = () => {
      if (bootReadyRef.current) return;
      const start = bootStartRef.current ?? Date.now();
      const elapsed = Date.now() - start;
      const authResolved = !authLoading && !authError;
      const canShowApp = authResolved && profileLoaded;

      const isOAuthOrReturn =
        donationReturnRef.current ||
        (typeof window !== "undefined" && (new URLSearchParams(window.location.search).has("code") || new URLSearchParams(window.location.search).has("state")));

      if (isOAuthOrReturn && (authResolved || !session)) {
        setBootProgress(100);
        setBootReady(true);
        return;
      }

      let target = 0;
      if (elapsed < SEGMENT_1) {
        target = (elapsed / SEGMENT_1) * 25;
      } else if (elapsed < SEGMENT_2) {
        target = 25 + ((elapsed - SEGMENT_1) / (SEGMENT_2 - SEGMENT_1)) * 35;
      } else if (elapsed < SEGMENT_3) {
        target = 60 + ((elapsed - SEGMENT_2) / (SEGMENT_3 - SEGMENT_2)) * 30;
      } else if (elapsed < BOOT_MIN_DURATION_MS) {
        target = 90 + ((elapsed - SEGMENT_3) / (BOOT_MIN_DURATION_MS - SEGMENT_3)) * 10;
      } else {
        target = 100;
      }

      if (!authResolved) {
        target = Math.min(target, 55);
      } else if (!profileLoaded) {
        target = Math.min(target, 80);
      }

      const next = Math.min(100, Math.max(0, Math.round(target)));
      setBootProgress(next);

      if (next >= 100 && canShowApp) {
        setBootReady(true);
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [publicRoute, state, authLoading, authError, profileLoaded]);

  if (state === "error") {
    return (
      <BootContext.Provider value={{ state, retry, continueOffline }}>
        <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center gap-5 bg-[var(--background)] p-6">
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BrandMark size={72} />
            <span className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">ETHONE</span>
          </motion.div>
          <p className="max-w-sm text-center text-sm text-[var(--text-muted)]">
            {error || "ETHONE n'a pas pu démarrer correctement."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={continueOffline}
              className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"
            >
              Continuer hors ligne
            </button>
          </div>
        </div>
      </BootContext.Provider>
    );
  }

  if (state === "offline") {
    return (
      <BootContext.Provider value={{ state, retry, continueOffline }}>
        <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center gap-5 bg-[var(--background)] p-6">
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BrandMark size={72} />
            <span className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">ETHONE</span>
          </motion.div>
          <p className="max-w-sm text-center text-sm text-[var(--text-muted)]">
            Vous êtes hors ligne. ETHONE nécessite une connexion pour démarrer.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={continueOffline}
              className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"
            >
              Continuer hors ligne
            </button>
          </div>
        </div>
      </BootContext.Provider>
    );
  }

  if (!bootReady) {
    const message = state === "recovering" ? "Redirection..." : "Initialisation d'ETHONE";
    return (
      <BootContext.Provider value={{ state, retry, continueOffline }}>
        <Loading message={message} progress={bootProgress} />
      </BootContext.Provider>
    );
  }

  if (publicRoute) {
    return (
      <BootContext.Provider value={{ state, retry, continueOffline }}>
        {children}
      </BootContext.Provider>
    );
  }

  return (
    <BootContext.Provider value={{ state, retry, continueOffline }}>
      <Shell>{children}</Shell>
    </BootContext.Provider>
  );
}
