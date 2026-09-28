"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { ADMIN_EMAIL } from "@/lib/admin";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const POLL_MS = 30_000;

interface Health {
  online: boolean;
  uptimeMs: number | null;
  pingMs: number | null;
  guildCount: number | null;
  rttMs: number | null;
  at: number;
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

function Pill({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3.5 text-sm">
      {tone && <span className={cn("h-2 w-2 rounded-full", tone === "ok" ? "bg-emerald-400" : "bg-red-400")} />}
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--text-primary)]">{value}</span>
    </span>
  );
}

/**
 * Infos en direct du bot (uptime, latence) pour l'en-tête du Bot Discord. Données réelles de /api/health.
 * Réservé au propriétaire : le nombre de serveurs et le statut en ligne/hors ligne ne regardent pas les
 * admins des autres serveurs qui utilisent le bot (fuite d'info sur l'ampleur du bot).
 */
export default function BotStatusStrip() {
  const { user } = useAuth();
  const isOwner = Boolean(user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  const [health, setHealth] = useState<Health | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!BOT_API_URL || !isOwner) return;
    let cancelled = false;
    const load = async () => {
      const start = performance.now();
      try {
        const res = await fetch(`${BOT_API_URL}/api/health`, { cache: "no-store" });
        const rttMs = Math.round(performance.now() - start);
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json) throw new Error("health");
        setHealth({
          online: Boolean(json.botOnline),
          uptimeMs: typeof json.uptimeMs === "number" ? json.uptimeMs : null,
          pingMs: typeof json.pingMs === "number" ? json.pingMs : null,
          guildCount: typeof json.guildCount === "number" ? json.guildCount : null,
          rttMs,
          at: Date.now(),
        });
      } catch {
        if (!cancelled) setHealth({ online: false, uptimeMs: null, pingMs: null, guildCount: null, rttMs: null, at: Date.now() });
      }
    };
    void load();
    const poll = window.setInterval(load, POLL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [isOwner]);

  if (!isOwner || !BOT_API_URL || !health) return null;

  const uptime = health.online && health.uptimeMs !== null ? formatUptime(health.uptimeMs + Math.max(0, now - health.at)) : null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <Pill label="Statut" value={health.online ? "En ligne" : "Hors ligne"} tone={health.online ? "ok" : "bad"} />
      {uptime && <Pill label="Uptime" value={uptime} />}
      {health.pingMs !== null && <Pill label="Latence Discord" value={`${health.pingMs} ms`} />}
      {health.guildCount !== null && <Pill label="Serveurs" value={String(health.guildCount)} />}
      <span className="hidden xl:inline-flex">{health.rttMs !== null && <Pill label="API" value={`${health.rttMs} ms`} />}</span>
    </div>
  );
}
