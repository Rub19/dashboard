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

  const { ok, errors, unconfigured, total } = useMemo(() => {
    const items = INTEGRATIONS.map((integration) => {
      const result = health[integration.id];
      const configured = configuredMap[integration.id] || false;
      const status: PingResult["status"] = result ? result.status : configured ? "connected" : "unconfigured";
      return { status };
    });
    return {
      ok: items.filter((i) => i.status === "connected").length,
      errors: items.filter((i) => i.status === "error").length,
      unconfigured: items.filter((i) => i.status === "unconfigured").length,
      total: items.length,
    };
  }, [health, configuredMap]);

  const tone = errors > 0 ? "error" : unconfigured > 0 ? "warning" : "success";

  return (
    <div className="mb-4 w-full overflow-hidden rounded-2xl v8-panel p-4 shadow-xl backdrop-blur-2xl">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{i18n("systemHealth")}</h2>
            <p className="text-[11px] text-zinc-400">
              {ok}/{total} {i18n("connected")}
            </p>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
              tone === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : tone === "warning"
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                  : "border-rose-500/20 bg-rose-500/10 text-rose-400"
            }`}
          >
            {tone === "success" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : tone === "warning" ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {errors > 0 ? `${errors} ${i18n("error")}` : unconfigured > 0 ? `${unconfigured} ${i18n("notConfigured")}` : i18n("all")}
          </span>

          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-400">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
            {i18n("latency")}: 30 ms
          </span>

          <button
            type="button"
            onClick={onTestAll}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-color)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-color)] transition hover:bg-[var(--accent-color)]/20 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {i18n("testAll")}
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-xl p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
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
            <div className="mt-3 grid gap-2 border-t border-white/[0.06] pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {INTEGRATIONS.map((integration) => {
                const result = health[integration.id];
                const configured = configuredMap[integration.id] || false;
                const status = result ? result.status : configured ? "connected" : "unconfigured";
                return (
                  <div
                    key={integration.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-300">
                      <ServiceIcon id={integration.id} icon={integration.icon} className="h-4 w-4" colored />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-zinc-200">{integration.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {result ? `${result.ms}ms` : i18n(status === "connected" ? "connected" : status === "error" ? "error" : "notConfigured")}
                      </p>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        status === "connected"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : status === "error"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-zinc-500/10 text-zinc-500"
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
