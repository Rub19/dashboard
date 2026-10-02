"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface Entry {
  rank: number;
  username: string;
  avatarUrl: string | null;
  level: number;
  totalXp: number;
  progressPercentage: number;
}
interface Payload {
  guild: { name: string; icon: string | null; members: number };
  accentColor: string;
  entries: Entry[];
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** Classement public d'un serveur (activé par son propriétaire). Lecture seule : pseudo, avatar, niveau, XP. */
export default function PublicLeaderboard() {
  const guildId = useSearchParams().get("guildId") ?? "";
  const [state, setState] = useState<"loading" | "ok" | "private" | "offline">("loading");
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    if (!guildId || !BOT_API_URL) {
      setState(guildId ? "offline" : "private");
      return;
    }
    let alive = true;
    fetch(`${BOT_API_URL}/api/public/leaderboard/${encodeURIComponent(guildId)}`)
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 404) return setState("private");
        if (!res.ok) throw new Error(String(res.status));
        setData((await res.json()) as Payload);
        setState("ok");
      })
      .catch(() => alive && setState("offline"));
    return () => {
      alive = false;
    };
  }, [guildId]);

  const accent = data?.accentColor ?? "#f59e0b";

  return (
    <main className="fixed inset-0 overflow-y-auto bg-[#0d0f14] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        {state === "loading" && (
          <div className="space-y-2" aria-busy="true" aria-label="Chargement du classement">
            <div className="mb-6 flex items-center gap-4">
              <div className="skeleton-shimmer h-14 w-14 rounded-2xl" />
              <div className="skeleton-shimmer h-7 w-48 rounded-lg" />
            </div>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton-shimmer h-16 rounded-2xl" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        )}
        {state === "private" && (
          <div className="rise-in rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <h1 className="text-lg font-bold">Ce classement n&apos;est pas public</h1>
            <p className="mt-2 text-sm text-zinc-400">Le propriétaire du serveur ne l&apos;a pas activé, ou le lien est incorrect.</p>
          </div>
        )}
        {state === "offline" && <p className="rise-in text-center text-sm text-zinc-400">Le classement est momentanément indisponible. Réessayez dans un instant.</p>}
        {state === "ok" && data && (
          <>
            <header className="rise-in mb-6 flex items-center gap-4">
              {data.guild.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.guild.icon} alt="" className="h-14 w-14 rounded-2xl" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black" style={{ background: accent }}>
                  {data.guild.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <h1 className="text-2xl font-black tracking-tight">{data.guild.name}</h1>
                <p className="text-sm text-zinc-400">Classement des membres les plus actifs · {data.guild.members.toLocaleString("fr-FR")} membres</p>
              </div>
            </header>
            {data.entries.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">Personne n&apos;a encore gagné d&apos;XP sur ce serveur.</p>
            ) : (
              <ol className="space-y-2">
                {data.entries.map((e, i) => (
                  <motion.li
                    key={e.rank}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    // Cascade plafonnée : au-delà des 12 premiers, tout arrive ensemble.
                    transition={{ duration: 0.4, delay: 0.1 + Math.min(i, 12) * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors duration-150 hover:bg-white/[0.06]"
                    style={e.rank <= 3 ? { borderColor: `${accent}55` } : undefined}
                  >
                    <span className="w-9 text-center text-base font-bold text-zinc-300">{MEDALS[e.rank - 1] ?? `#${e.rank}`}</span>
                    {e.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="h-10 w-10 rounded-full bg-zinc-800" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.username}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" aria-label={`${e.progressPercentage}% vers le niveau suivant`}>
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${e.progressPercentage}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + Math.min(i, 12) * 0.04, ease: [0.16, 1, 0.3, 1] }}
                          style={{ background: accent }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: accent }}>
                        Niveau {e.level}
                      </p>
                      <p className="text-[11px] text-zinc-500">{e.totalXp.toLocaleString("fr-FR")} XP</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            )}
            <p className="mt-8 text-center text-[11px] text-zinc-600">Propulsé par ETHONE</p>
          </>
        )}
      </div>
    </main>
  );
}
