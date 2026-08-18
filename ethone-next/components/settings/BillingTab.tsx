"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

type Accent = "emerald" | "amber" | "sky" | "violet" | "rose";

const accentMap: Record<Accent, string> = {
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function BillingCard({
  icon,
  title,
  description,
  children,
  accent = "emerald",
}: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
  accent?: Accent;
}) {
  return (
    <div className="group relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-sm backdrop-blur-2xl transition-all hover:border-white/15">
      <div className="mb-4 flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${accentMap[accent]}`}
        >
          <Icon name={icon} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-white">{title}</h3>
          <p className="truncate text-[10px] text-zinc-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function BillingTab() {
  const i18n = useI18n();
  const [storage, setStorage] = useState({ used: 1.2, total: 10 });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) return;
    navigator.storage
      .estimate()
      .then((est) => {
        const total = (est.quota || 10 * 1024 ** 3) / 1024 ** 3;
        const used = (est.usage || 0) / 1024 ** 3;
        setStorage({ used: Math.max(0.1, used), total: Math.max(used, total) });
      })
      .catch(() => {
        // keep fallback
      });
  }, []);

  const percent = useMemo(
    () => Math.min(100, Math.round((storage.used / storage.total) * 100)),
    [storage]
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Plan actuel */}
      <BillingCard
        icon="gem"
        title={i18n("currentPlan") || "Plan actuel"}
        description={i18n("planDescription") || "Votre abonnement ETHONE"}
        accent="violet"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">—</span>
            <span className="rounded-lg border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {i18n("noPlan", "Aucun abonnement")}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {i18n("noPlanDescription", "Aucun plan actif pour le moment.")}
          </p>
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-xs font-medium text-zinc-500"
          >
            <CreditCard className="h-3.5 w-3.5" />
            {i18n("managePlan") || "Gérer le plan"}
          </button>
        </div>
      </BillingCard>

      {/* Stockage & Quotas */}
      <BillingCard
        icon="database"
        title={i18n("storageAndQuotas") || "Stockage & Quotas"}
        description={i18n("storageDescription") || "Espace cloud utilisé"}
        accent="emerald"
      >
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">
              {storage.used.toFixed(1)} <span className="text-sm text-zinc-500">/ {storage.total.toFixed(0)} GB</span>
            </span>
            <span className="text-xs font-mono text-zinc-400">{percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">{i18n("storageHint") || "Vous utilisez moins de 15% de votre quota."}</p>
        </div>
      </BillingCard>

      {/* Cycle de facturation */}
      <BillingCard
        icon="calendar-clock"
        title={i18n("billingCycle") || "Cycle de facturation"}
        description={i18n("billingCycleDescription") || "Renouvellement automatique"}
        accent="amber"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold tracking-tight text-white">—</span>
            <Icon name="refresh-cw" className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="text-xs text-zinc-500">
            {i18n("noBillingCycle", "Aucun cycle de facturation configuré.")}
          </p>
        </div>
      </BillingCard>
    </div>
  );
}
