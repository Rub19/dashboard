"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/hooks/useI18n";
import type { Integration } from "@/lib/integrations";
import type { PingResult } from "@/lib/connection-config";
import ServiceIcon from "@/components/ServiceIcon";
import ConnectionBadge from "@/components/ConnectionBadge";

type MyConnectionsRowProps = {
  integrations: Integration[];
  configuredMap: Record<string, boolean>;
  health: Record<string, PingResult>;
  onSelect?: (id: string) => void;
};

export default function MyConnectionsRow({ integrations, configuredMap, health, onSelect }: MyConnectionsRowProps) {
  const i18n = useI18n();

  if (integrations.length === 0) return null;

  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold leading-none text-[var(--text-primary)]">{i18n("myConnections", "Mes connexions")}</h3>
        <span className="inline-flex h-4 items-center rounded-full bg-[var(--accent-primary)]/10 px-1.5 text-[10px] font-semibold leading-none text-[var(--accent-primary)]">
          {integrations.length}
        </span>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {integrations.map((integration) => {
          const result = health[integration.id];
          const status: PingResult["status"] = result
            ? result.status
            : configuredMap[integration.id]
              ? "connected"
              : "unconfigured";
          const variant = status === "connected" ? "connected" : status === "error" ? "error" : "unconfigured";
          const label =
            status === "connected"
              ? i18n("connected", "Connecté")
              : status === "error"
                ? i18n("error", "Erreur")
                : i18n("notConfigured", "Non configuré");

          return (
            <motion.button
              key={integration.id}
              type="button"
              onClick={() => onSelect?.(integration.id)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="group flex shrink-0 items-center gap-2.5 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2.5 pr-3 transition hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)]/40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--text-primary)]/[0.04]">
                <ServiceIcon id={integration.id} icon={integration.icon} className="h-4 w-4" colored />
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">{integration.name}</p>
                <ConnectionBadge variant={variant} dot>{label}</ConnectionBadge>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
