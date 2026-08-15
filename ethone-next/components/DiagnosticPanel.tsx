"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { INTEGRATIONS } from "@/lib/integrations";
import type { PingResult } from "@/lib/connection-config";
import ServiceIcon from "@/components/ServiceIcon";

export type HealthMap = Record<string, PingResult>;

export default function DiagnosticPanel({
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

  const items = useMemo(() => {
    return INTEGRATIONS.map((integration) => {
      const result = health[integration.id];
      const configured = configuredMap[integration.id] || false;
      const status: PingResult["status"] = result
        ? result.status
        : configured
          ? "connected"
          : "unconfigured";
      return { integration, status, result, configured };
    });
  }, [health, configuredMap]);

  const ok = items.filter((i) => i.status === "connected").length;
  const errors = items.filter((i) => i.status === "error").length;
  const unconfigured = items.filter((i) => i.status === "unconfigured").length;
  const total = items.length;

  const statusTone = errors > 0 ? "danger" : unconfigured > 0 ? "warning" : "success";

  return (
    <div className="overflow-hidden rounded-3xl border border-white/5 bg-surface/60 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{i18n("systemHealth")}</h2>
            <p className="text-xs text-muted">
              {ok}/{total} {i18n("connected")} · {i18n("latency")} {i18n("ping")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${
              statusTone === "success"
                ? "bg-emerald-500/10 text-emerald-400"
                : statusTone === "warning"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-rose-500/10 text-rose-400"
            }`}
          >
            {errors > 0 ? `${errors} ${i18n("error")}` : unconfigured > 0 ? `${unconfigured} ${i18n("notConfigured")}` : i18n("all")}
          </span>

          <button
            type="button"
            onClick={onTestAll}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-xl bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{i18n("testAll")}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-xl p-2 text-muted transition hover:bg-surface-raised hover:text-foreground"
            aria-label={expanded ? i18n("collapse") : i18n("expand")}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: expanded ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className="overflow-hidden"
        style={{ height: expanded ? "auto" : 0 }}
      >
        <div className="border-t border-white/5 p-4 sm:p-5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {items.map(({ integration, status, result }) => (
                <motion.div
                  key={integration.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-surface-raised/50 p-3 backdrop-blur-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface text-foreground">
                    <ServiceIcon id={integration.id} icon={integration.icon} className="h-4 w-4" colored />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{integration.name}</p>
                    <p className="text-[10px] text-muted">
                      {result ? `${result.ms}ms` : i18n(status === "connected" ? "connected" : status === "error" ? "error" : "notConfigured")}
                    </p>
                  </div>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      status === "connected"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : status === "error"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    {status === "connected" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : status === "error" ? (
                      <AlertCircle className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
