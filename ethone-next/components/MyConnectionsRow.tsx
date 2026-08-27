"use client";

import { motion } from "framer-motion";
import type { Integration } from "@/lib/integrations";
import type { PingResult } from "@/lib/connection-config";
import ServiceIcon from "@/components/ServiceIcon";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type MyConnectionsRowProps = {
  integrations: Integration[];
  configuredMap: Record<string, boolean>;
  health: Record<string, PingResult>;
  onSelect?: (id: string) => void;
};

export default function MyConnectionsRow({
  integrations,
  configuredMap,
  health,
  onSelect,
}: MyConnectionsRowProps) {
  if (integrations.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Icon name="plug" className="h-4 w-4 text-[var(--accent-primary)]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Mes Connexions Actives
        </h3>
        <span className="rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2 py-0.2 text-[10px] font-bold text-[var(--accent-primary)]">
          {integrations.length}
        </span>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {integrations.map((integration) => {
          const result = health[integration.id];
          const isOk = result?.status === "connected" || configuredMap[integration.id];

          return (
            <motion.button
              key={integration.id}
              type="button"
              onClick={() => onSelect?.(integration.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "group flex shrink-0 items-center gap-3 rounded-2xl border p-2.5 pr-4 transition-all cursor-pointer shadow-sm",
                isOk
                  ? "border-[var(--accent-primary)]/30 bg-[var(--surface-raised)]/70 hover:border-[var(--accent-primary)]/60 hover:bg-[var(--surface-raised)]"
                  : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:border-[var(--panel-border)]/80"
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] shadow-xs">
                <ServiceIcon id={integration.id} icon={integration.icon} className="h-5 w-5" colored />
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-bold text-[var(--text-primary)]">{integration.name}</p>
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-[var(--success)] font-medium">Connecté</span>
                  {result?.ms ? (
                    <span className="rounded bg-[var(--surface-raised)] px-1 py-0.2 font-mono text-[9px] text-[var(--text-muted)] border border-[var(--panel-border)]">
                      {result.ms}ms
                    </span>
                  ) : null}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
