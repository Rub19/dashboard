"use client";

import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WORKER_URL } from "@/lib/api";
import { getWriteAt } from "@/lib/settings";
import { useSyncStore } from "@/lib/stores/sync";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import BentoCard from "@/components/BentoCard";

type CheckStatus = "idle" | "running" | "success" | "error";

type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  ms?: number;
  detail?: string;
};

const INITIAL_CHECKS: Check[] = [
  { id: "auth", label: "Authentification Supabase", status: "idle" },
  { id: "database", label: "Connexion base de données", status: "idle" },
  { id: "worker", label: "Worker Cloudflare", status: "idle" },
  { id: "cache", label: "Cache & Stockage local", status: "idle" },
  { id: "theme", label: "Thème & tokens CSS", status: "idle" },
  { id: "sync", label: "Synchronisation des réglages", status: "idle" },
];

export default function DiagnosticPanel() {
  const i18n = useI18n();
  const [checks, setChecks] = useState<Check[]>(INITIAL_CHECKS);
  const [running, setRunning] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<CheckStatus>("idle");

  const runCheck = useCallback(
    async (id: string, runner: () => Promise<unknown>, detail?: () => string) => {
      setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, status: "running" } : c)));
      const start = typeof performance !== "undefined" ? performance.now() : Date.now();
      let ok = false;
      let ms = 0;
      let errorText = "";
      try {
        await runner();
        ok = true;
        ms = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - start);
      } catch (err) {
        ms = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - start);
        errorText = err instanceof Error ? err.message : String(err);
      }
      const detailText = detail ? detail() : ok ? "OK" : errorText;
      setChecks((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: ok ? "success" : "error", ms, detail: detailText } : c))
      );
      return ok;
    },
    []
  );

  const runAll = useCallback(async () => {
    setRunning(true);
    setGlobalStatus("running");
    setChecks(INITIAL_CHECKS.map((c) => ({ ...c, status: "running" })));

    const results: boolean[] = [];

    results.push(
      await runCheck("auth", async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data?.user) throw new Error("Aucun utilisateur authentifié");
      }, () => "Session valide")
    );

    results.push(
      await runCheck("database", async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) throw new Error("Session absente");
        const { error } = await supabase.from("user_settings").select("user_id").limit(1).maybeSingle();
        if (error && error.code !== "PGRST116") throw error;
      })
    );

    results.push(
      await runCheck("worker", async () => {
        const res = await fetch(`${WORKER_URL}/api/health`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Worker HTTP ${res.status}`);
        const json = await res.json().catch(() => null);
        if (!json || json.status !== "ok") throw new Error("Worker non opérationnel");
      }, () => "Worker opérationnel")
    );

    results.push(
      await runCheck("cache", async () => {
        if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
          throw new Error("Storage API indisponible");
        }
        const est = await navigator.storage.estimate();
        if (!est) throw new Error("Impossible d'estimer le stockage");
        const quota = est.quota || 0;
        if (quota === 0) throw new Error("Quota non déterminé");
      }, () => {
        if (typeof navigator === "undefined" || !navigator.storage?.estimate) return "Storage API indisponible";
        return "Stockage accessible";
      })
    );

    results.push(
      await runCheck("theme", async () => {
        if (typeof document === "undefined") throw new Error("Document indisponible");
        const root = getComputedStyle(document.documentElement);
        const accent = root.getPropertyValue("--accent-primary").trim();
        if (!accent) throw new Error("Variables CSS non initialisées");
      }, () => {
        if (typeof document === "undefined") return "—";
        const root = getComputedStyle(document.documentElement);
        const accent = root.getPropertyValue("--accent-primary").trim();
        return `Accent: ${accent || "—"}`;
      })
    );

    results.push(
      await runCheck("sync", async () => {
        const writeAt = getWriteAt();
        if (writeAt === 0) throw new Error("Aucune sauvegarde locale");
        const syncStatus = useSyncStore.getState().status;
        if (syncStatus === "error") throw new Error("Dernière synchronisation en échec");
      }, () => {
        const writeAt = getWriteAt();
        const syncStatus = useSyncStore.getState().status;
        const when = writeAt ? new Date(writeAt).toLocaleTimeString() : "—";
        return `Statut: ${syncStatus} — Dernier enregistrement: ${when}`;
      })
    );

    setGlobalStatus(results.every(Boolean) ? "success" : "error");
    setRunning(false);
  }, [runCheck]);

  const statusLabel = useMemo(() => {
    switch (globalStatus) {
      case "success":
        return "Tous les systèmes sont opérationnels";
      case "error":
        return "Problèmes détectés";
      case "running":
        return "Diagnostic en cours...";
      default:
        return "Prêt à lancer le diagnostic";
    }
  }, [globalStatus]);

  return (
    <BentoCard
      title={i18n("diagnosticTitle", "Diagnostic ETHONE")}
      icon="activity"
      className="w-full"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium",
              globalStatus === "success" && "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]",
              globalStatus === "error" && "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]",
              globalStatus === "running" && "border-[var(--info)]/30 bg-[var(--info)]/10 text-[var(--info)]",
              globalStatus === "idle" && "border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                globalStatus === "success" && "bg-[var(--success)]",
                globalStatus === "error" && "bg-[var(--danger)]",
                globalStatus === "running" && "animate-pulse bg-[var(--info)]",
                globalStatus === "idle" && "bg-[var(--text-muted)]"
              )}
            />
            {statusLabel}
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Icon name={running ? "loader-2" : "play"} pack="phosphor" className={cn("h-3.5 w-3.5", running && "animate-spin")} />}
            onClick={runAll}
            disabled={running}
          >
            {running ? i18n("diagnosticRunning", "Diagnostic en cours...") : i18n("runDiagnostic", "Lancer le diagnostic")}
          </Button>
        </div>

        <div className="space-y-1.5">
          {checks.map((check) => (
            <div
              key={check.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-[var(--text-primary)]/[0.04] bg-[var(--text-primary)]/[0.02] px-3 py-2.5 transition-colors",
                check.status === "success" && "border-[var(--success)]/10 bg-[var(--success)]/[0.03]",
                check.status === "error" && "border-[var(--danger)]/10 bg-[var(--danger)]/[0.03]"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  check.status === "success" && "bg-[var(--success)]/10 text-[var(--success)]",
                  check.status === "error" && "bg-[var(--danger)]/10 text-[var(--danger)]",
                  check.status === "running" && "bg-[var(--info)]/10 text-[var(--info)]",
                  check.status === "idle" && "bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]"
                )}
              >
                {check.status === "running" ? (
                  <Icon name="loader-2" pack="phosphor" className="h-3.5 w-3.5 animate-spin" />
                ) : check.status === "success" ? (
                  <Icon name="check" pack="phosphor" className="h-3.5 w-3.5" />
                ) : check.status === "error" ? (
                  <Icon name="x" pack="phosphor" className="h-3.5 w-3.5" />
                ) : (
                  <Icon name="minus" pack="phosphor" className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--text-primary)]">{check.label}</p>
                {(check.detail || check.ms !== undefined) && (
                  <p className="truncate text-[10px] text-[var(--text-muted)]">
                    {check.detail} {check.ms !== undefined && check.ms > 0 ? `· ${check.ms} ms` : ""}
                  </p>
                )}
              </div>
              {check.ms !== undefined && check.status !== "idle" && (
                <span
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px]",
                    check.status === "success" && "bg-[var(--success)]/10 text-[var(--success)]",
                    check.status === "error" && "bg-[var(--danger)]/10 text-[var(--danger)]"
                  )}
                >
                  {check.ms} ms
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}
