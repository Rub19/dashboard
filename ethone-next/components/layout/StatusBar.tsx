"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Wifi,
  WifiOff,
  User,
  LogOut,
  Shield,
  Radio,
} from "lucide-react";
import { useLiveWidgetStore } from "@/lib/hooks/useLiveWidgetStore";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSyncStore, type SyncState } from "@/lib/stores/sync";
import { WORKER_URL } from "@/lib/api";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import type { AnimatedBadgeStatus } from "@/components/motion/animated-badge";
import VersionPill from "./VersionPill";

function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function usePing() {
  const online = useOnlineStatus();
  const [ping, setPing] = useState<number | null>(null);
  const [pingging, setPinging] = useState(false);

  const measure = useCallback(async () => {
    if (!online || !WORKER_URL) {
      setPing(null);
      return;
    }
    setPinging(true);
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      await fetch(`${WORKER_URL}/health?cache=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        mode: "no-cors",
      });
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      setPing(Math.round(end - start));
    } catch {
      setPing(null);
    } finally {
      setPinging(false);
    }
  }, [online]);

  useEffect(() => {
    measure();
    const interval = setInterval(measure, 10000);
    return () => clearInterval(interval);
  }, [measure]);

  return { ping, pingging };
}

function useSessionRole() {
  const { user } = useAuth();
  if (!user) return { id: "guest" as const, label: "Invité", color: "text-zinc-400" };
  const role =
    (user.user_metadata?.role as string | undefined) ||
    (user.app_metadata?.role as string | undefined) ||
    user.role;
  if (role === "admin" || role === "owner") {
    return { id: "admin" as const, label: "Admin", color: "text-amber-400" };
  }
  return { id: "normal" as const, label: "Normal", color: "text-emerald-400" };
}

function CloudSyncPill({
  status,
  online,
  sources,
  i18n,
}: {
  status: SyncState;
  online: boolean;
  sources: Record<string, SyncState>;
  i18n: (key: string, fallback?: string) => string;
}) {
  const errorSources = Object.entries(sources)
    .filter(([, v]) => v === "error")
    .map(([k]) => i18n(`syncSource.${k}`, k));
  const errorTitle = errorSources.length
    ? `${i18n("syncErrorSources", "Sources en erreur")} : ${errorSources.join(", ")}`
    : i18n("syncError", "La synchronisation a échoué");

  const badgeStatus: AnimatedBadgeStatus =
    status === "syncing" ? "loading" : status === "error" ? "danger" : status === "offline" ? "warning" : "success";
  const badgeLabel =
    status === "syncing"
      ? i18n("v8Syncing", "Synchronisation")
      : status === "error"
        ? i18n("syncError", "Erreur sync")
        : status === "offline"
          ? i18n("v8Offline", "Hors ligne")
          : online
            ? i18n("v8Saved", "Enregistré")
            : i18n("v8Ready", "Prêt");

  return (
    <AnimatedBadge
      status={badgeStatus}
      size="sm"
      title={status === "error" ? errorTitle : undefined}
    >
      {badgeLabel}
    </AnimatedBadge>
  );
}

export default function StatusBar() {
  const i18n = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();
  const { unreadCount } = useNotifications();
  const { error: liveError } = useLiveData(300000);
  const { isOpen, isMinimized, openLive, closeLive } = useLiveWidgetStore();
  const online = useOnlineStatus();
  const { ping, pingging } = usePing();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userLabel = publicProfile?.display_name || activeProfile?.name || user?.email || i18n("guest");
  const sessionRole = useSessionRole();

  const syncStatus = useSyncStore((s) => s.status);
  const syncSources = useSyncStore((s) => s.sources);

  const systemOk = online && !liveError && unreadCount === 0;
  const alertCount = liveError ? 1 : unreadCount;
  const alertTitle = liveError
    ? `${i18n("liveError", "Erreur live")} : ${liveError.message}`
    : unreadCount > 0
      ? `${unreadCount} ${i18n("unreadNotifications", "notifications non lues")}`
      : undefined;

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push("/login");
  }

  return (
    <footer
      data-v8-status-bar
      data-status-bar
      className="fixed bottom-0 left-0 z-30 h-8 w-full select-none border-t border-white/[0.05] bg-black/40 px-4 text-xs text-zinc-400 backdrop-blur-md"
    >
      <div className="flex h-full w-full items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <AnimatedBadge
            status={sessionRole.id === "admin" ? "warning" : sessionRole.id === "guest" ? "neutral" : "success"}
            size="sm"
            icon={<Shield className="h-3 w-3" />}
          >
            {sessionRole.label}
          </AnimatedBadge>

          <CloudSyncPill status={syncStatus} online={online} sources={syncSources} i18n={i18n} />
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <AnimatedBadge
            status={isOpen ? "info" : "neutral"}
            size="sm"
            pulse={isOpen}
            icon={<Radio className="h-3 w-3" />}
            onClick={() => (isOpen ? (isMinimized ? openLive() : closeLive()) : openLive())}
          >
            {isOpen
              ? (isMinimized ? i18n("liveMinimized") || "Live réduit" : i18n("liveActive") || "Live actif")
              : i18n("openLive") || "Live"}
          </AnimatedBadge>

          <AnimatedBadge
            status={online ? (pingging ? "loading" : "success") : "danger"}
            size="sm"
            icon={online ? (pingging ? undefined : <Wifi className="h-3 w-3" />) : <WifiOff className="h-3 w-3" />}
          >
            {online ? (ping !== null ? `${ping} ms` : i18n("v8NetworkOnline")) : i18n("v8NetworkOffline")}
          </AnimatedBadge>

          <div className="relative" ref={menuRef}>
            <AnimatedBadge
              status="neutral"
              size="sm"
              icon={<User className="h-3 w-3" />}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {userLabel}
            </AnimatedBadge>
            {menuOpen && (
              <div className="absolute bottom-full left-1/2 z-40 mb-2 w-40 -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl shadow-black/80 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <User className="h-3.5 w-3.5" />
                  Profil
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-red-500/[0.08] hover:text-red-300"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>

          <VersionPill />

          <AnimatedBadge
            status={systemOk ? "success" : "danger"}
            size="sm"
            title={alertTitle}
            onClick={() => router.push("/system")}
          >
            {systemOk ? "Opérationnel" : `${alertCount} alerte${alertCount > 1 ? "s" : ""}`}
          </AnimatedBadge>
        </div>
      </div>
    </footer>
  );
}
