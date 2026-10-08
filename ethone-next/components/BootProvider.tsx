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
import dynamic from "next/dynamic";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import Loading from "@/components/Loading";
import BrandMark from "@/components/BrandMark";
import { AnimatePresence, motion } from "framer-motion";

// Shell (sidebar, topbar, floating dock, command palette, live widgets, and
// everything else the authenticated app pulls in) was a static import here,
// so its entire bundle shipped on every route below — including /login and
// the other PUBLIC_ROUTES, which never render it at all (see the
// `publicRoute` branch below). It was never part of the statically exported
// HTML anyway: this component only ever reaches the "authenticated" state
// client-side, after a real session resolves, which can't happen during the
// build's prerender pass. Making it a dynamic import removes ~2MB of JS from
// every public page's initial load without changing when/whether it renders.
// Le module est préchargé pendant le démarrage (voir shellLoaded) : l'écran de démarrage reste affiché jusqu'à ce
// qu'il soit prêt, au lieu d'enchaîner un second écran de chargement une fois la barre arrivée à 100 %.
const loadShell = () => import("@/components/Shell");
const Shell = dynamic(loadShell, { ssr: false, loading: () => null });

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

const PUBLIC_ROUTES = ["/login", "/password-recovery", "/reset-password", "/terms", "/privacy", "/bot", "/leaderboard", "/extension"];

const BOOT_TIMEOUT_MS = 8_000;
// Kept short on purpose: this is only a floor for the progress-bar animation
// to feel intentional, not a wait for real work — auth/profile resolution
// still gates readiness independently via canShowApp below. A long floor
// here means every cold load/refresh pays it even when session+profile are
// already warm/cached.
const BOOT_MIN_DURATION_MS = 160;
// Temps pendant lequel la barre reste visible à 100 % avant la sortie animée.
const BOOT_FULL_HOLD_MS = 260;

// Pages d'information (vitrine du bot, conditions, confidentialité) : lisibles par tous, connectés ou non. Contrairement
// à /login, un utilisateur déjà connecté n'en est pas renvoyé vers l'accueil.
const INFO_ROUTES = ["/terms", "/privacy", "/bot", "/leaderboard", "/extension"];

function isInfoRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return INFO_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

// Où renvoyer après connexion : seulement des chemins internes attendus, jamais une URL arbitraire (pas d'open redirect).
export function safeLoginNext(raw: string | null | undefined): string {
  const next = raw || "";
  // trailingSlash: true dans next.config → /clip/ en production.
  return /^\/clip\/?$/.test(next) || next.startsWith("/spaces/join") ? next : "/";
}

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function resolvePublicRoute(pathname: string | null): boolean {
  if (pathname) return isPublicRoute(pathname);
  if (typeof window !== "undefined") return isPublicRoute(window.location.pathname);
  return true;
}

const MFA_CHALLENGE_ROUTE = "/login/verify";

function isMfaChallengeRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === MFA_CHALLENGE_ROUTE || pathname.startsWith(`${MFA_CHALLENGE_ROUTE}/`);
}

export default function BootProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading, error: authError, refreshSession, mfaPending } = useAuth();
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
  // Pages publiques : prêtes tout de suite (aucun écran de démarrage, contenu présent dans le HTML exporté).
  const [bootProgress, setBootProgress] = useState(() => (resolvePublicRoute(pathname) ? 100 : 0));
  const [bootReady, setBootReady] = useState(() => resolvePublicRoute(pathname));
  const [shellLoaded, setShellLoaded] = useState(false);
  const shellLoadedRef = useRef(false);
  const fullAtRef = useRef<number | null>(null);
  const bootReadyRef = useRef(false);
  const bootStartRef = useRef<number | null>(null);
  const donationReturnRef = useRef(false);
  // Écran de démarrage seulement au premier lancement de la session d'onglet : ensuite (rechargement, retour depuis
  // une autre page), l'app s'affiche dès qu'elle est prête, sans écran ni durée minimale.
  // Même règle que le script de <head> (app/layout.tsx) qui masque l'écran statique avant React : lancé il y a < 12 h.
  const [warm] = useState(() => {
    try {
      const at = Number(localStorage.getItem("ethone:booted-at"));
      return typeof window !== "undefined" && at > 0 && Date.now() - at < 12 * 3600_000;
    } catch {
      return false;
    }
  });
  const warmRef = useRef(warm);

  const publicRoute = resolvePublicRoute(pathname);

  useEffect(() => {
    if (publicRoute || shellLoadedRef.current) return;
    const done = () => {
      shellLoadedRef.current = true;
      setShellLoaded(true);
    };
    // En cas d'échec, next/dynamic réessaiera au rendu : on ne bloque pas le démarrage.
    loadShell().then(done, done);
  }, [publicRoute]);

  useEffect(() => {
    bootReadyRef.current = bootReady;
    if (bootReady && !resolvePublicRoute(pathname)) {
      try {
        localStorage.setItem("ethone:booted-at", String(Date.now()));
      } catch {}
    }
  }, [bootReady, pathname]);

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
      // A password/OAuth/passkey sign-in already handed the browser a
      // fully valid Supabase session before any of this app's own code
      // runs — mfaPending === null means "still checking whether this
      // session needs a 2FA code" (see AuthProvider's syncMfaStatus), and
      // must be treated like still-booting rather than "not pending", or
      // the dashboard would flash open for a moment on every login before
      // being yanked back to the challenge screen.
      if (mfaPending === null) {
        setState("booting");
        return;
      }
      if (mfaPending) {
        if (isInfoRoute(pathname)) {
          setState("ready");
          return;
        }
        if (!isMfaChallengeRoute(pathname)) {
          setState("recovering");
          router.replace(MFA_CHALLENGE_ROUTE);
          return;
        }
        // On the challenge screen itself: render it without waiting on
        // profileLoaded (there's no dashboard to show yet) and without the
        // authenticated <Shell> below.
        setState("ready");
        return;
      }
      if (!profileLoaded) {
        setState("booting");
        return;
      }
      setState("authenticated");
      if (publicRoute && !isInfoRoute(pathname)) {
        setState("recovering");
        router.replace(safeLoginNext(new URLSearchParams(window.location.search).get("next")));
      }
    } else if (publicRoute) {
      setState("ready");
    } else {
      // No session (never logged in, expired, or revoked — e.g. Phase 1's
      // SESSION_REVOKED) on a page that requires one. Previously this fell
      // through to the same "ready" state as the public-route case below,
      // and nothing else in this component (or anywhere else in the app)
      // ever redirected away — the private route's <Shell>{children}</Shell>
      // rendered anyway with no session, leaving the user stuck on a
      // partially-authenticated page instead of being sent to /login. Mirror
      // the symmetric session-on-a-public-route case above: bounce to
      // /login rather than rendering a private page with nothing behind it.
      setState("recovering");
      const here = window.location.pathname + window.location.search;
      // Le clip de l'extension vit dans le #hash (jamais envoyé au serveur) : on le garde le temps de la connexion.
      if (/^\/clip\/?$/.test(window.location.pathname) && window.location.hash) {
        try { sessionStorage.setItem("ethone:clip", window.location.hash); } catch { /* stockage indisponible */ }
      }
      router.replace(safeLoginNext(here) === "/" ? "/login" : `/login?next=${encodeURIComponent(here)}`);
    }
  }, [authLoading, authError, session, mfaPending, profileLoaded, publicRoute, pathname, router]);

  const retry = useCallback(() => {
    setError(null);
    setState("booting");
    setBootReady(false);
    setBootProgress(0);
    bootStartRef.current = null;
    fullAtRef.current = null;
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
    let timer: ReturnType<typeof setTimeout> | null = null;
    // requestAnimationFrame est totalement suspendu dans un onglet en arrière-plan : un
    // onglet ouvert « en arrière-plan » restait bloqué sur l'écran de chargement (jusqu'à
    // l'erreur de délai) alors que tout était prêt. Onglet caché → minuteur à la place.
    const schedule = () => {
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(tick, 200);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

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

      // Vraies étapes : connexion -> profil -> module de l'app. Dans chaque étape la barre avance vers sa cible en
      // ralentissant (jamais figée, jamais en avance sur ce qui est vraiment prêt) et ne recule jamais.
      const creep = (from: number, to: number) => from + (to - from) * (1 - Math.exp(-elapsed / 700));
      let target: number;
      if (!authResolved) target = creep(4, 50);
      else if (!profileLoaded) target = Math.max(55, creep(55, 82));
      else if (!shellLoadedRef.current) target = Math.max(86, creep(86, 96));
      else target = 100;
      setBootProgress((prev) => Math.max(prev, Math.round(target)));

      // Onglet caché : personne ne voit la barre, on ouvre l'app sans délai d'animation.
      const hidden = typeof document !== "undefined" && document.hidden;
      const fast = hidden || warmRef.current;
      if (canShowApp && shellLoadedRef.current && (fast || elapsed >= BOOT_MIN_DURATION_MS)) {
        fullAtRef.current = fullAtRef.current ?? Date.now();
        if (fast || Date.now() - fullAtRef.current >= BOOT_FULL_HOLD_MS) {
          setBootReady(true);
          return;
        }
      }

      schedule();
    };

    tick();
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [publicRoute, state, authLoading, authError, profileLoaded, shellLoaded, session]);

  if (state === "error") {
    return (
      <BootContext.Provider value={{ state, retry, continueOffline }}>
        <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center gap-5 bg-[var(--bg-main)] p-6">
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
        <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center gap-5 bg-[var(--bg-main)] p-6">
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

  const authResolvedNow = !authLoading && !authError;
  const message =
    state === "recovering"
      ? "Redirection…"
      : !authResolvedNow
        ? "Connexion sécurisée…"
        : !profileLoaded
          ? "Chargement de ton profil…"
          : "Préparation de ton espace…";

  // Arrivée sur une page privée depuis une page publique (après la connexion) : on attend aussi le module de l'app.
  const showApp = bootReady && (publicRoute || shellLoaded);

  // L'app se monte sous l'écran de démarrage, qui s'efface ensuite en la dévoilant (au lieu de disparaître d'un coup).
  return (
    <BootContext.Provider value={{ state, retry, continueOffline }}>
      {showApp && (publicRoute ? children : <Shell>{children}</Shell>)}
      <AnimatePresence>{!showApp && !warm && <Loading key="boot" message={message} progress={bootProgress} />}</AnimatePresence>
    </BootContext.Provider>
  );
}
