"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Bot, Clock, Cpu, Gauge, ListChecks, Radio, RotateCw, ShieldAlert, Terminal } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { confirmDialog } from "@/lib/confirmDialog";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const POLL_MS = 30_000;

type Overview = {
  globalStatus: {
    status: "operational" | "degraded" | "critical";
    statusMessage: string;
    uptimeSeconds: number;
    activeIncidentsCount: number;
    version: string;
  };
  snapshot: {
    memory?: { rssMb?: number; heapPercent?: number };
    latency?: { currentPingMs?: number };
  };
};

const STATUS: Record<Overview["globalStatus"]["status"], { label: string; color: string }> = {
  operational: { label: "En ligne", color: "var(--success)" },
  degraded: { label: "Dégradé", color: "var(--warning)" },
  critical: { label: "En panne", color: "var(--danger)" },
};

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d} j ${h} h`;
  if (h) return `${h} h ${m} min`;
  return `${m} min`;
}

const LINKS = [
  { href: "/discord/bot", label: "Centre de contrôle", icon: Terminal },
  { href: "/discord/bot/presence", label: "Statut et présence", icon: Radio },
  { href: "/discord/bot/performance", label: "Performances", icon: Gauge },
  { href: "/discord/bot/errors", label: "Erreurs", icon: AlertTriangle },
  { href: "/discord/bot/jobs", label: "Tâches planifiées", icon: ListChecks },
  { href: "/discord/bot/commands", label: "Commandes", icon: Bot },
  { href: "/discord/owner-shield", label: "Bouclier owner", icon: ShieldAlert },
] as const;

/**
 * Section « Owner Etho » de la barre latérale : n'apparaît que si le bot répond 200 à sa route réservée au
 * propriétaire (/api/bot/overview, 403 pour tout le monde sinon). L'état est relu toutes les 30 s.
 */
export default function OwnerBotSection({ itemClass }: { itemClass: string }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [restarting, setRestarting] = useState(false);
  const restartingRef = useRef(false);

  const load = useCallback(async () => {
    if (!BOT_API_URL) return false;
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/overview`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setData(null);
        return false;
      }
      const json = await res.json();
      if (json?.data?.globalStatus) setData(json.data);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (!restartingRef.current) void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const restart = async () => {
    if (restarting) return;
    if (!(await confirmDialog("Redémarrer le bot ? Il sera hors ligne quelques secondes (musique en cours coupée)."))) return;
    setRestarting(true);
    restartingRef.current = true;
    try {
      const res = await fetch(`${BOT_API_URL}/api/bot/restart`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      // Le bot s'arrête puis pm2 le relance : on attend qu'il réponde à nouveau (2 min max).
      const started = Date.now();
      await new Promise((r) => setTimeout(r, 4000));
      while (Date.now() - started < 120_000) {
        if (await load()) {
          success("Bot redémarré", "Etho est de nouveau en ligne.");
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      throw new Error("Le bot ne répond pas après 2 minutes : vérifie pm2 sur le VPS.");
    } catch (err) {
      toastError("Redémarrage", err instanceof Error ? err.message : "Bot injoignable");
    } finally {
      setRestarting(false);
      restartingRef.current = false;
    }
  };

  if (!data) return null;
  const st = STATUS[data.globalStatus.status] ?? STATUS.operational;
  const ping = data.snapshot.latency?.currentPingMs;
  const ram = data.snapshot.memory?.rssMb;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_LAYOUT} className="space-y-1 pt-2">
      <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Owner Etho</span>

      <div className="mx-0.5 space-y-2 rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)] p-2.5 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
            <span className="relative flex h-2 w-2">
              {!restarting && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ background: st.color }} />}
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: restarting ? "var(--warning)" : st.color }} />
            </span>
            {restarting ? "Redémarrage…" : st.label}
          </span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">v{data.globalStatus.version}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[var(--text-muted)]">
          <span className="flex items-center gap-1" title="Temps depuis le dernier démarrage">
            <Clock className="h-3 w-3" />
            {formatUptime(data.globalStatus.uptimeSeconds)}
          </span>
          {typeof ping === "number" && (
            <span className="flex items-center gap-1" title="Latence avec Discord">
              <Activity className="h-3 w-3" />
              {ping} ms
            </span>
          )}
          {typeof ram === "number" && (
            <span className="flex items-center gap-1" title="Mémoire utilisée">
              <Cpu className="h-3 w-3" />
              {Math.round(ram)} Mo
            </span>
          )}
          <span
            className={cn("flex items-center gap-1", data.globalStatus.activeIncidentsCount > 0 && "text-[var(--warning)]")}
            title={data.globalStatus.statusMessage}
          >
            <AlertTriangle className="h-3 w-3" />
            {data.globalStatus.activeIncidentsCount} incident{data.globalStatus.activeIncidentsCount > 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={restart}
          disabled={restarting}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-[var(--panel-border)] py-1.5 font-semibold text-[var(--text-primary)] transition-[background-color,transform] duration-150 hover:bg-[var(--surface-hover,var(--surface-raised))] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          <RotateCw className={cn("h-3.5 w-3.5", restarting && "animate-spin")} />
          {restarting ? "Redémarrage en cours" : "Redémarrer le bot"}
        </button>
      </div>

        <div className="space-y-0.5 text-xs">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <button key={href} type="button" onClick={() => router.push(href)} className={itemClass}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
    </motion.div>
  );
}
