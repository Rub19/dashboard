"use client";

import { useEffect, useState } from "react";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface Overview {
  members: number | null;
  channels: number | null;
  roles: number | null;
  commandsToday: number | null;
  commandsTotal: number | null;
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
      <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("fr-FR"));

/** Aperçu chiffré du serveur choisi (données réelles de /overview), avec le nombre de modules actifs connu de la page. */
export default function ServerOverview({ guildId, activeModules, totalModules }: { guildId: string; activeModules: number; totalModules: number }) {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    if (!BOT_API_URL || !guildId) return;
    let cancelled = false;
    setData(null);
    fetch(`${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/overview`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.guild) return;
        setData({
          members: num(j.guild.memberCount),
          channels: num(j.guild.channelsCount),
          roles: num(j.guild.rolesCount),
          commandsToday: num(j.stats?.commandsToday),
          commandsTotal: num(j.stats?.totalCommands),
        });
      })
      .catch(() => {
        // bot injoignable : on n'affiche que les modules actifs, connus côté dashboard
      });
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Tile label="Membres" value={fmt(data?.members ?? null)} />
      <Tile label="Salons" value={fmt(data?.channels ?? null)} />
      <Tile label="Rôles" value={fmt(data?.roles ?? null)} />
      <Tile label="Modules actifs" value={`${activeModules} / ${totalModules}`} />
      <Tile label="Commandes aujourd'hui" value={fmt(data?.commandsToday ?? null)} />
      <Tile label="Commandes au total" value={fmt(data?.commandsTotal ?? null)} />
    </div>
  );
}
