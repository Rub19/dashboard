"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
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

const BOOT_TIMEOUT_MS = 10_000;

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
  const pathname = usePathname();
  const router = useRouter();

  const [state, setState] = useState<BootState>(() => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      return "offline";
    }
    // usePathname peut être null au premier rendu client ou pendant le SSG.
    // On se base sur l'URL réelle pour ne jamais rendre une page protégée
    // avant d'avoir vérifié l'authentification.
    return resolvePublicRoute(pathname) ? "unauthenticated" : "booting";
  });

  const [error, setError] = useState<string | null>(null);

  const check = useCallback(() => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setState("offline");
      return;
    }

    const publicRoute = resolvePublicRoute(pathname);

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
      setState("authenticated");
      if (publicRoute) {
        setState("recovering");
        router.replace("/");
      }
    } else {
      setState("unauthenticated");
      if (!publicRoute) {
        setState("recovering");
        router.replace("/login");
      }
    }
  }, [authLoading, authError, session, pathname, router]);

  const retry = useCallback(() => {
    setError(null);
    setState("booting");
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

  const publicRoute = resolvePublicRoute(pathname);

  if (state === "booting" || state === "recovering") {
    return (
      <BootContext.Provider value={{ state, retry, continueOffline }}>
        <Loading message={state === "recovering" ? "Redirection..." : "Initialisation d'ETHONE"} />
      </BootContext.Provider>
    );
  }

  if (state === "error") {
    return (
      <BootContext.Provider value={{ state, retry, continueOffline }}>
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[var(--background)] p-6">
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BrandMark size={72} />
            <span className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">ETHONE</span>
          </motion.div>
          <p className="max-w-sm text-center text-sm text-[var(--muted)]">
            {error || "ETHONE n'a pas pu démarrer correctement."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={continueOffline}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
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
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[var(--background)] p-6">
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BrandMark size={72} />
            <span className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">ETHONE</span>
          </motion.div>
          <p className="max-w-sm text-center text-sm text-[var(--muted)]">
            Vous êtes hors ligne. ETHONE nécessite une connexion pour démarrer.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={continueOffline}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
            >
              Continuer hors ligne
            </button>
          </div>
        </div>
      </BootContext.Provider>
    );
  }

  const isAuthenticated = state === "authenticated" || session !== null;

  if (!isAuthenticated && !publicRoute) {
    return (
      <BootContext.Provider value={{ state, retry, continueOffline }}>
        <Loading message="Redirection..." />
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
