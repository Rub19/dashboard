"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { motion, animate, useInView } from "framer-motion";
import { Users, Hash, Shield, Layers, Zap, Terminal } from "@/components/icons/ph";
import { pageStagger, staggerItem } from "@/lib/motion-variants";
import { EASE_SNAP } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface Overview {
  members: number | null;
  channels: number | null;
  roles: number | null;
  commandsToday: number | null;
  commandsTotal: number | null;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const fmt = (n: number) => n.toLocaleString("fr-FR");

/** Valeur réelle qui défile jusqu'à son nombre la première fois qu'elle apparaît. */
function Counter({ value }: { value: number }) {
  const { reduced } = useMotionPref();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduced) {
      el.textContent = fmt(value);
      return;
    }
    const c = animate(0, value, { duration: 1.2, ease: EASE_SNAP, onUpdate: (v) => (el.textContent = fmt(Math.round(v))) });
    return () => c.stop();
  }, [inView, value, reduced]);
  return <span ref={ref}>{fmt(reduced ? value : 0)}</span>;
}

function Tile({ label, icon: Icon, value, suffix, loading }: { label: string; icon: ComponentType<{ className?: string }>; value: number | null; suffix?: string; loading: boolean }) {
  return (
    <motion.div
      variants={staggerItem}
      className="group relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 transition-[border-color,transform] duration-300 [transition-timing-function:var(--ease-snap)] hover:border-[var(--text-primary)]/15"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[var(--text-primary)]/20 to-transparent" />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-[var(--text-muted)]">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[var(--accent-primary)]" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
        {value !== null ? (
          <>
            <Counter value={value} />
            {suffix}
          </>
        ) : loading ? (
          <span className="skeleton-shimmer inline-block h-7 w-14 rounded-md bg-[var(--text-primary)]/[0.05] align-middle" />
        ) : (
          "—"
        )}
      </p>
    </motion.div>
  );
}

/** Aperçu chiffré du serveur choisi (données réelles de /overview), avec le nombre de modules actifs connu de la page. */
export default function ServerOverview({ guildId, activeModules, totalModules }: { guildId: string; activeModules: number; totalModules: number }) {
  const { reduced } = useMotionPref();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(Boolean(BOT_API_URL));

  useEffect(() => {
    if (!BOT_API_URL || !guildId) return;
    let cancelled = false;
    setData(null);
    setLoading(true);
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  return (
    <motion.div
      variants={pageStagger}
      initial={reduced ? "animate" : "initial"}
      animate="animate"
      className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
    >
      <Tile label="Membres" icon={Users} value={data?.members ?? null} loading={loading} />
      <Tile label="Salons" icon={Hash} value={data?.channels ?? null} loading={loading} />
      <Tile label="Rôles" icon={Shield} value={data?.roles ?? null} loading={loading} />
      <Tile label="Modules actifs" icon={Layers} value={activeModules} suffix={` / ${totalModules}`} loading={false} />
      <Tile label="Commandes aujourd'hui" icon={Zap} value={data?.commandsToday ?? null} loading={loading} />
      <Tile label="Commandes au total" icon={Terminal} value={data?.commandsTotal ?? null} loading={loading} />
    </motion.div>
  );
}
