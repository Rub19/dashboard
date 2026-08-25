"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Wifi,
  WifiOff,
  User,
  LogOut,
  Shield,
  AlertCircle,
  Circle,
  Radio,
} from "lucide-react";
import { useLiveWidgetStore } from "@/lib/hooks/useLiveWidgetStore";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSyncStore, type SyncState } from "@/lib/stores/sync";
import { WORKER_URL } from "@/lib/api";
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
  if (!user) return { id: "guest" as const, label: "Invité", color: "text-[var(--text-muted)]" };
  const role =
    (user.user_metadata?.role as string | undefined) ||
    (user.app_metadata?.role as string | undefined) ||
    user.role;
  if (role === "admin" || role === "owner") {
    return { id: "admin" as const, label: "Admin", color: "text-[var(--warning)]" };
  }
  return { id: "normal" as const, label: "Normal", color: "text-[var(--success)]" };
}

function CloudSyncPill({
  status,
  online,
  errorSources,
  i18n,
}: {
  status: SyncState;
  online: boolean;
  errorSources: string;
  i18n: (key: string, fallback?: string) => string;
}) {
  const errorTitle = errorSources
    ? `${i18n("syncErrorSources", "Sources en erreur")} : ${errorSources
        .split(", ")
        .map((k) => i18n(`syncSource.${k}`, k))
        .join(", ")}`
    : i18n("syncError", "La synchronisation a échoué");

  switch (status) {
    case "syncing":
      return (
        <StatusPill
          icon={<Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--info)]" />}
          value="Synchronisation..."
          tone="info"
        />
      );
    case "error":
      return (
        <StatusPill
          icon={<AlertCircle className="h-3.5 w-3.5 text-[var(--danger)]" />}
          value="Erreur sync"
          title={errorTitle}
          tone="error"
        />
      );
    case "offline":
      return (
        <StatusPill
          icon={<WifiOff className="h-3.5 w-3.5 text-[var(--warning)]" />}
          value="Hors ligne"
          tone="warning"
        />
      );
    default:
      return (
        <StatusPill
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />}
          value={online ? "Enregistré" : "Prêt"}
          tone={online ? "success" : "error"}
        />
      );
  }
}

type StatusPillProps = {
  icon?: React.ReactNode;
  label?: string;
  value?: string;
  title?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  tone?: "default" | "success" | "warning" | "error" | "info";
};

function StatusPill({ icon, label, value, title, children, onClick, tone = "default" }: StatusPillProps) {
  const toneClass = {
    default: "hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] text-[var(--text-primary)]",
    success: "hover:bg-[var(--success)]/[0.1] hover:text-[var(--success)] text-[var(--success)]",
    warning: "hover:bg-[var(--warning)]/[0.1] hover:text-[var(--warning)] text-[var(--warning)]",
    error: "hover:bg-[var(--danger)]/[0.1] hover:text-[var(--danger)] text-[var(--danger)]",
    info: "hover:bg-[var(--info)]/[0.1] hover:text-[var(--info)] text-[var(--info)]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`group flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs transition-colors ${
        onClick ? `${toneClass} cursor-pointer` : "text-[var(--text-muted)]"
      }`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label && <span className="hidden whitespace-nowrap opacity-60 md:inline">{label}</span>}
      {value && <span className="truncate font-medium">{value}</span>}
      {children}
    </button>
  );
}

export default function StatusBar() {
  const i18n = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();
  const { isOpen, isMinimized, openLive, closeLive } = useLiveWidgetStore();
  const online = useOnlineStatus();
  const { ping, pingging } = usePing();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userLabel = publicProfile?.display_name || activeProfile?.name || user?.email || i18n("guest");
  const sessionRole = useSessionRole();

  const syncStatus = useSyncStore((s) => s.status);
  const syncErrorSources = useSyncStore((s) =>
    Object.entries(s.sources)
      .filter(([, v]) => v === "error")
      .map(([k]) => k)
      .join(", ")
  );

  const systemOk = online;
  const alertCount = online ? 0 : 1;
  const alertTitle = !online ? i18n("v8NetworkOffline") : undefined;

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
      className="fixed bottom-3 left-3 right-3 z-0 h-auto select-none bg-transparent px-0 text-xs text-[var(--text-primary)] pointer-events-none"
    >
      <div className="flex w-full items-end justify-between">
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-xl border border-[var(--panel-border)]/60 bg-[var(--panel-bg)]/70 px-2 py-1 backdrop-blur-md">
          <span
            className="hidden select-none rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.03] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--text-muted)] sm:inline-flex"
            aria-label={i18n("appName", "ETHONE")}
          >
            ETHONE
          </span>
          <VersionPill />

          <StatusPill
            icon={<Shield className="h-3.5 w-3.5" />}
            value={sessionRole.label}
            tone={
              sessionRole.id === "admin"
                ? "warning"
                : sessionRole.id === "guest"
                ? "default"
                : "success"
            }
          />

          <CloudSyncPill status={syncStatus} online={online} errorSources={syncErrorSources} i18n={i18n} />
        </div>

        <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-xl border border-[var(--panel-border)]/60 bg-[var(--panel-bg)]/70 px-2 py-1 backdrop-blur-md">
          {isOpen ? (
            <button
              type="button"
              onClick={() => (isMinimized ? openLive() : closeLive())}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)] transition-all hover:bg-[var(--accent-primary)]/20"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse text-[var(--accent-primary)]" />
              <span>{isMinimized ? i18n("liveMinimized") || "Live réduit" : i18n("liveActive") || "Live actif"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openLive()}
              aria-label={i18n("openLive") || "Ouvrir Live"}
              className="rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <Radio className="h-3.5 w-3.5" />
            </button>
          )}

          <StatusPill
            icon={
              online ? (
                pingging ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />
                ) : (
                  <Wifi className="h-3.5 w-3.5" />
                )
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )
            }
            value={online ? (ping !== null ? `${ping} ms` : i18n("v8NetworkOnline")) : i18n("v8NetworkOffline")}
            tone={online ? "success" : "error"}
          />

          <div className="relative" ref={menuRef}>
            <StatusPill
              icon={<User className="h-3.5 w-3.5" />}
              value={userLabel}
              onClick={() => setMenuOpen((v) => !v)}
            />
            {menuOpen && (
              <div className="absolute bottom-full left-1/2 z-40 mb-2 w-40 -translate-x-1/2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1 shadow-2xl backdrop-blur-[var(--panel-blur)]">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)]"
                >
                  <User className="h-3.5 w-3.5" />
                  Profil
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--danger)]/[0.08] hover:text-[var(--danger)]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>

          <StatusPill
            icon={systemOk ? <Circle className="h-3.5 w-3.5 fill-[var(--success)] text-[var(--success)]" /> : <AlertCircle className="h-3.5 w-3.5 text-[var(--danger)]" />}
            value={systemOk ? "Opérationnel" : `${alertCount} alerte${alertCount > 1 ? "s" : ""}`}
            title={alertTitle}
            tone={systemOk ? "success" : "error"}
            onClick={() => router.push("/system")}
          />
        </div>
      </div>
    </footer>
  );
}
