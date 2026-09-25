"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";
import { subscribeGuildLive } from "@/lib/guildLive";
import { confirmDialog } from "@/lib/confirmDialog";
import ChannelPicker from "@/components/discord/ChannelPicker";
import PageHeader from "@/components/discord/PageHeader";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface CountingConfig {
  guildId: string;
  enabled: boolean;
  channelId: string | null;
  allowConsecutive: boolean;
  resetOnMistake: boolean;
  count: number;
  lastUserId: string | null;
  highScore: number;
  totalCorrect: number;
  totalMistakes: number;
  lastResetAt: string | null;
}

interface CountingOverview {
  config: CountingConfig;
  leaderboard: Array<{ userId: string; correct: number; mistakes: number; name?: string; avatarUrl?: string | null }>;
}

function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-3.5 text-left transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-zinc-400">{hint}</span>}
      </span>
      <span className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200", checked ? "bg-[#5865F2]" : "bg-white/15")}>
        <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-4" : "translate-x-0")} />
      </span>
    </button>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-4">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

/**
 * Module Comptage : état du jeu (nombre actuel, record, justes/erreurs), classement et réglages. Tout vient du bot ; si
 * celui-ci ne répond pas, la page le dit au lieu d'afficher des chiffres inventés.
 */
export default function CountingCenterClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const { success, error: showError } = useToast();

  const [overview, setOverview] = useState<CountingOverview | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "offline">("loading");
  const [saving, setSaving] = useState(false);

  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/counting`;

  const load = useCallback(async () => {
    if (!guildId || !BOT_API_URL) {
      setState(BOT_API_URL ? "loading" : "offline");
      return;
    }
    try {
      const res = await fetch(`${base}/overview`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      setOverview((await res.json()) as CountingOverview);
      setState("ok");
    } catch {
      setState("offline");
    }
  }, [guildId, base]);

  useEffect(() => {
    void load();
  }, [load]);

  // Le compteur bouge à chaque message sur Discord : on se resynchronise sur les changements du bot.
  useEffect(() => {
    if (!guildId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeGuildLive(guildId, (event) => {
      if (event.type !== "CONFIG_UPDATED") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), 300);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [guildId, load]);

  const save = async (patch: Partial<Pick<CountingConfig, "enabled" | "channelId" | "allowConsecutive" | "resetOnMistake">>) => {
    setSaving(true);
    try {
      const res = await fetch(`${base}/config`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || String(res.status));
      setOverview({ config: data.config, leaderboard: data.leaderboard });
      success("Comptage mis à jour", "Le bot applique ce réglage tout de suite.");
    } catch (err) {
      showError("Réglage non enregistré", err instanceof Error && err.message ? err.message : "Le bot n'a pas répondu.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!(await confirmDialog("Remettre le compteur à zéro ? Le record et le classement sont conservés.", { title: "Remettre à zéro", confirmLabel: "Remettre à zéro", tone: "danger" }))) return;
    setSaving(true);
    try {
      const res = await fetch(`${base}/reset`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error("refusé");
      setOverview({ config: data.config, leaderboard: data.leaderboard });
      success("Compteur remis à zéro", "Le prochain nombre est 1.");
    } catch {
      showError("Compteur non remis à zéro", "Le bot n'a pas répondu ou a refusé.");
    } finally {
      setSaving(false);
    }
  };

  const config = overview?.config;
  const ready = state === "ok" && !!config;

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] p-4 pb-44 text-white sm:p-8">
      <div className="mx-auto w-full max-w-4xl min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/discord${guildId ? `?guildId=${guildId}` : ""}`} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Retour au hub Discord
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.05]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </button>
        </div>

        <PageHeader hideBack guildId={guildId} icon="mod-counting" tint="teal" title="Comptage" subtitle="Les membres comptent 1, 2, 3… à tour de rôle dans un salon. Une erreur remet le compteur à zéro." />

        {state === "loading" && <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-zinc-500">Chargement…</div>}

        {state === "offline" && (
          <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-zinc-400">
            Le bot n&apos;a pas répondu pour ce serveur : le jeu ne peut pas être affiché. Vérifiez que le bot est bien présent, puis actualisez.
          </div>
        )}

        {ready && config && (
          <>
            {!config.enabled && (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-xs leading-relaxed text-amber-100/90">
                Le jeu est <strong>désactivé</strong> (c&apos;est le réglage par défaut). Choisissez un salon ci-dessous puis activez-le, ou lancez <code className="rounded bg-black/30 px-1">/counting setup</code> sur Discord.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Nombre actuel" value={String(config.count)} hint={`Prochain : ${config.count + 1}`} />
              <Stat label="Record" value={String(config.highScore)} />
              <Stat label="Justes" value={String(config.totalCorrect)} />
              <Stat label="Erreurs" value={String(config.totalMistakes)} />
            </div>

            <section className="space-y-3 rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <h2 className="text-sm font-semibold">Réglages</h2>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-zinc-400">Salon de comptage</p>
                <ChannelPicker
                  value={config.channelId}
                  guildId={guildId}
                  filterTypes={[0, 5]}
                  disabled={saving}
                  onChange={(id) => void save({ channelId: id })}
                  placeholder="Choisir le salon où l'on compte"
                />
                <p className="mt-1.5 text-[11px] text-zinc-500">Changer de salon remet le compteur à zéro.</p>
              </div>
              <Switch
                checked={config.enabled}
                disabled={saving || !config.channelId}
                onChange={(v) => void save({ enabled: v })}
                label="Jeu actif"
                hint={config.channelId ? "Les messages qui commencent par un nombre sont vérifiés dans ce salon ; les autres sont ignorés." : "Choisissez d'abord un salon."}
              />
              <Switch
                checked={config.resetOnMistake}
                disabled={saving}
                onChange={(v) => void save({ resetOnMistake: v })}
                label="Remise à zéro en cas d'erreur"
                hint="Sinon le bot signale seulement le bon nombre et le jeu continue."
              />
              <Switch
                checked={config.allowConsecutive}
                disabled={saving}
                onChange={(v) => void save({ allowConsecutive: v })}
                label="Autoriser deux nombres de suite par le même membre"
                hint="Par défaut, il faut qu'un autre membre compte entre deux passages."
              />
              <button
                type="button"
                disabled={saving || config.count === 0}
                onClick={() => void reset()}
                className="cursor-pointer rounded-xl border border-rose-500/30 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remettre le compteur à zéro
              </button>
            </section>

            <section className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.02] p-5">
              <h2 className="mb-3 text-sm font-semibold">Classement</h2>
              {overview && overview.leaderboard.length > 0 ? (
                <ol className="space-y-1.5">
                  {overview.leaderboard.map((e, i) => (
                    <li key={e.userId} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3.5 py-2 text-xs">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="w-5 shrink-0 text-center font-bold text-zinc-500">{i + 1}</span>
                        {e.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full" />
                        ) : (
                          <span className="h-6 w-6 shrink-0 rounded-full bg-white/10" />
                        )}
                        <span className="truncate text-sm font-semibold text-zinc-200">{e.name ?? e.userId}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-300">
                        {e.correct} juste{e.correct > 1 ? "s" : ""}
                        {e.mistakes > 0 && <span className="text-zinc-500"> · {e.mistakes} erreur{e.mistakes > 1 ? "s" : ""}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-zinc-500">Personne n&apos;a encore compté.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
