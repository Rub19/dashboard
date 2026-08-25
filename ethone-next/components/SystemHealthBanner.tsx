"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { INTEGRATIONS } from "@/lib/integrations";
import type { PingResult } from "@/lib/connection-config";
import ServiceIcon from "@/components/ServiceIcon";

export type HealthMap = Record<string, PingResult>;

export default function SystemHealthBanner({
  configuredMap,
  health,
  testing,
  onTestAll,
}: {
  configuredMap: Record<string, boolean>;
  health: HealthMap;
  testing: boolean;
  onTestAll: () => void;
}) {
  const i18n = useI18n();
  const [expanded, setExpanded] = useState(false);

  const { ok, errors, total, avgLatency } = useMemo(() => {
    const { ok, err, msSum, msCount } = INTEGRATIONS.reduce(
      (acc, integration) => {
        const result = health[integration.id];
        const configured = configuredMap[integration.id] || false;
        const status: PingResult["status"] = result ? result.status : configured ? "connected" : "unconfigured";
        if (status === "connected") acc.ok += 1;
        if (status === "error") acc.err += 1;
        if (result && result.ms > 0) {
          acc.msSum += result.ms;
          acc.msCount += 1;
        }
        return acc;
      },
      { ok: 0, err: 0, msSum: 0, msCount: 0 }
    );
    return {
      ok,
      errors: err,
      total: INTEGRATIONS.length,
      avgLatency: msCount > 0 ? Math.round(msSum / msCount) : 0,
    };
  }, [health, configuredMap]);

  const tone = errors > 0 ? "error" : ok > 0 ? "success" : "warning";

  return (
    <div className="mb-4 w-full overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm backdrop-blur-[var(--panel-blur)]">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{i18n("connectionsStatus", "État des connexions")}</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              {ok}/{total} {i18n("connected", "connectées")}
              {errors > 0 && ` · ${errors} ${i18n("error", "erreur").toLowerCase()}`}
              {avgLatency > 0 && ` · ${avgLatency}ms`}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${
              tone === "success"
                ? "border-[var(--success)]/20 bg-[var(--success)]/10 text-[var(--success)]"
                : tone === "error"
                  ? "border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]"
                  : "border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]"
            }`}
          >
            {tone === "success" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : tone === "error" ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <Activity className="h-3 w-3" />
            )}
            {tone === "success" ? i18n("allOk", "Tout fonctionne") : tone === "error" ? `${errors} ${i18n("needAttention", "erreur(s)")}` : i18n("notConfigured", "Non configuré")}
          </span>

          {avgLatency > 0 && (
            <span className="rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-2.5 py-1 text-xs font-mono text-[var(--accent-primary)]">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
              {avgLatency} ms
            </span>
          )}

          <button
            type="button"
            onClick={onTestAll}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)]/20 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {i18n("testAll", "Tester toutes")}
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)]"
            aria-label={expanded ? i18n("collapse") : i18n("expand")}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid gap-2 border-t border-[var(--text-primary)]/[0.06] pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {INTEGRATIONS.map((integration) => {
                const result = health[integration.id];
                const configured = configuredMap[integration.id] || false;
                const status = result ? result.status : configured ? "connected" : "unconfigured";
                return (
                  <div
                    key={integration.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--text-primary)]/[0.04] text-[var(--text-primary)]">
                      <ServiceIcon id={integration.id} icon={integration.icon} className="h-4 w-4" colored />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--text-primary)]">{integration.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {result ? `${result.ms}ms` : i18n(status === "connected" ? "connected" : status === "error" ? "error" : "notConfigured")}
                      </p>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        status === "connected"
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : status === "error"
                            ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                            : "bg-[var(--text-primary)]/[0.05] text-[var(--text-muted)]"
                      }`}
                    >
                      {status === "connected" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : status === "error" ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
